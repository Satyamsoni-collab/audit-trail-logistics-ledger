
import EventBus from '../EventBus.js';
import InventoryItemReadModel from '../../models/readModels/InventoryItem.js';
import cacheService from '../../config/redis.js';

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
      throw new Error(
        '[Projector Error] Invalid inventory event received.'
      );
    }

    return true;
  }

  async onItemCreated(event) {
    this.isValidEvent(event);

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
      throw new Error(
        `[Projector Error] Invalid initial inventory data for ${event.aggregateId}`
      );
    }

    try {
      // Idempotent upsert: create the read model only if it does not exist.
      await InventoryItemReadModel.findOneAndUpdate(
        { aggregateId: event.aggregateId },
        {
          $setOnInsert: {
            sku: event.payload.sku,
            name: event.payload.name,
            location: event.payload.location,
            quantity,
            lastProcessedVersion: event.version,
            status: quantity === 0 ? 'OUT_OF_STOCK' : 'AVAILABLE'
          }
        },
        {
          upsert: true,
          new: true,
          runValidators: true
        }
      );

      await cacheService.del(`cache:inventory:${event.aggregateId}`);

      console.log(
        `[Projector] Created/Verified read model for item ${event.aggregateId} at version ${event.version}`
      );
    } catch (error) {
      // Duplicate key can occur during concurrent/replayed creation.
      if (error.code === 11000) {
        const existingItem = await InventoryItemReadModel.findOne({
          aggregateId: event.aggregateId
        });

        if (existingItem) {
          console.log(
            `[Projector] Duplicate ITEM_CREATED ignored for ${event.aggregateId}`
          );
          return;
        }
      }

      console.error(
        `[Projector Error] Failed to project ITEM_CREATED: ${error.message}`
      );
      throw error;
    }
  }

  async onStockUpdated(event) {
    this.isValidEvent(event);

    const quantityChange = event.payload.quantityChange;

    if (!Number.isSafeInteger(quantityChange)) {
      throw new Error(
        `[Projector Error] Invalid quantityChange for ${event.aggregateId}`
      );
    }

    // Validate direction so the event type matches the stock change.
    if (
      (event.eventType === 'STOCK_ADDED' && quantityChange <= 0) ||
      (event.eventType === 'STOCK_REMOVED' && quantityChange >= 0)
    ) {
      throw new Error(
        `[Projector Error] Invalid quantityChange direction for ${event.eventType}`
      );
    }

    try {
      const item = await InventoryItemReadModel.findOne({
        aggregateId: event.aggregateId
      });

      if (!item) {
        throw new Error(
          `Item ${event.aggregateId} not found for stock update.`
        );
      }

      // Duplicate or older events have already been applied.
      if (event.version <= item.lastProcessedVersion) {
        console.log(
          `[Projector] Ignoring duplicate or old event for ${event.aggregateId}`
        );
        return;
      }

      // Events must be processed in aggregate-version order.
      if (event.version !== item.lastProcessedVersion + 1) {
        throw new Error(
          `Version gap for ${event.aggregateId}. ` +
          `Expected ${item.lastProcessedVersion + 1}, received ${event.version}.`
        );
      }

      const newQuantity = item.quantity + quantityChange;

      if (!Number.isSafeInteger(newQuantity) || newQuantity < 0) {
        throw new Error(
          `Invalid resulting stock quantity for ${event.aggregateId}`
        );
      }

      const newStatus =
        newQuantity === 0 ? 'OUT_OF_STOCK' : 'AVAILABLE';

      // Optimistic concurrency check prevents applying an update
      // if the read model changed after it was read.
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
        throw new Error(
          `Concurrent update detected for ${event.aggregateId}. ` +
          'Event was not applied; recovery or replay is required.'
        );
      }

      await cacheService.del(`cache:inventory:${event.aggregateId}`);

      console.log(
        `[Projector] Updated stock for item ${event.aggregateId}. ` +
        `New Qty: ${updatedItem.quantity}, Version: ${updatedItem.lastProcessedVersion}`
      );
    } catch (error) {
      console.error(
        `[Projector Error] Failed to project stock update: ${error.message}`
      );
      throw error;
    }
  }
}

export default new InventoryProjector();
