import EventBus from '../EventBus.js';
import InventoryItemReadModel from '../../models/readModels/InventoryItem.js';

/**
 * Projector for the Inventory Item Read Model.
 * It listens to events emitted from the Event Store and updates the
 * materialized view (read model) in MongoDB.
 */
class InventoryProjector {
  constructor() {
    EventBus.subscribe('ITEM_CREATED', this.onItemCreated.bind(this));
    EventBus.subscribe('STOCK_ADDED', this.onStockUpdated.bind(this));
    EventBus.subscribe('STOCK_REMOVED', this.onStockUpdated.bind(this));

    console.log(
      '[Projector] InventoryProjector initialized and listening for events.'
    );
  }

  // Validate common inventory event fields
  isValidEvent(event) {
    if (
      !event ||
      typeof event.aggregateId !== 'string' ||
      !event.aggregateId.trim() ||
      !event.payload ||
      typeof event.payload !== 'object' ||
      Array.isArray(event.payload) ||
      !Number.isSafeInteger(event.version) ||
      event.version < 1
    ) {
      console.error(
        '[Projector Error] Invalid inventory event received.'
      );
      return false;
    }

    return true;
  }

  async onItemCreated(event) {
    if (!this.isValidEvent(event)) {
      return;
    }

    try {
      // Day 13 Idempotent Upsert: Ensures replay doesn't crash on duplicate ITEM_CREATED events
      await InventoryItemReadModel.findOneAndUpdate(
        { aggregateId: event.aggregateId },
        {
          $setOnInsert: {
            sku: event.payload.sku,
            name: event.payload.name,
            location: event.payload.location,
            quantity: event.payload.quantity,
            lastProcessedVersion: event.version
          }
        },
        { upsert: true, new: true }
      );

      console.log(`[Projector] Verified/Created read model for item ${event.aggregateId} at version ${event.version}`);
      const quantity = event.payload.quantity ?? 0;

      if (
        !Number.isSafeInteger(quantity) ||
        quantity < 0 ||
        typeof event.payload.sku !== 'string' ||
        !event.payload.sku.trim() ||
        typeof event.payload.name !== 'string' ||
        !event.payload.name.trim() ||
        typeof event.payload.location !== 'string' ||
        !event.payload.location.trim()
      ) {
        console.error(
          `[Projector Error] Invalid initial inventory data for ${event.aggregateId}`
        );
        return;
      }

      const newItem = new InventoryItemReadModel({
        aggregateId: event.aggregateId,
        sku: event.payload.sku,
        name: event.payload.name,
        location: event.payload.location,
        quantity,
        lastProcessedVersion: event.version,
        status: quantity === 0 ? 'OUT_OF_STOCK' : 'AVAILABLE'
      });

      await newItem.save();

      console.log(
        `[Projector] Created read model for item ${event.aggregateId}`
 origin/main
    } catch (error) {
      if (error.code === 11000) {
        console.log(
          `[Projector] Duplicate ITEM_CREATED ignored for ${event.aggregateId}`
        );
        return;
      }

      console.error(
        `[Projector Error] Failed to project ITEM_CREATED: ${error.message}`
      );
    }
  }

  async onStockUpdated(event) {
    if (!this.isValidEvent(event)) {
      return;
    }

    const quantityChange = event.payload.quantityChange;

    if (!Number.isSafeInteger(quantityChange)) {
      console.error(
        `[Projector Error] Invalid quantityChange for ${event.aggregateId}`
      );
      return;
    }

    try {
      const item = await InventoryItemReadModel.findOne({
        aggregateId: event.aggregateId
      });

      if (!item) {
        console.error(
          `[Projector Error] Item ${event.aggregateId} not found for stock update.`
        );
        return;
      }

      // Ignore events that have already been processed.
      if (event.version <= item.lastProcessedVersion) {
        console.log(
          `[Projector] Ignoring duplicate or old event for ${event.aggregateId}`
        );
        return;
      }

      // Process events in aggregate-version order.
      if (event.version !== item.lastProcessedVersion + 1) {
        console.error(
          `[Projector Error] Version gap for ${event.aggregateId}. ` +
          `Expected ${item.lastProcessedVersion + 1}, received ${event.version}.`
        );
        return;
      }

      const newQuantity = item.quantity + quantityChange;

      if (!Number.isSafeInteger(newQuantity) || newQuantity < 0) {
        console.error(
          `[Projector Error] Invalid resulting stock quantity for ${event.aggregateId}`
        );
        return;
      }

      const newStatus =
        newQuantity === 0 ? 'OUT_OF_STOCK' : 'AVAILABLE';

      // Update only if the read model still has the version and
      // quantity we previously read. This prevents concurrent writes
      // from overwriting one another.
      const updatedItem = await InventoryItemReadModel.findOneAndUpdate(
        {
          aggregateId: event.aggregateId,
          lastProcessedVersion: item.lastProcessedVersion,
          quantity: item.quantity
        },
        {
          $set: {
            quantity: newQuantity,
            lastProcessedVersion: event.version,
            status: newStatus
          }
        },
        {
          new: true,
          runValidators: true
        }
      );

      if (!updatedItem) {
        console.error(
          `[Projector Error] Concurrent update detected for ${event.aggregateId}. ` +
          'Event was not applied; retry or replay is required.'
        );
        return;
      }

      console.log(
        `[Projector] Updated stock for item ${event.aggregateId}. ` +
        `New Qty: ${updatedItem.quantity}, Version: ${updatedItem.lastProcessedVersion}`
      );
    } catch (error) {
      console.error(
        `[Projector Error] Failed to project stock update: ${error.message}`
      );
    }
  }
}

export default new InventoryProjector();