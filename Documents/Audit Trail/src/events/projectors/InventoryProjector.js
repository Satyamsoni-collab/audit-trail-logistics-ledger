
import EventBus from '../EventBus.js';
import InventoryItemReadModel from '../../models/readModels/InventoryItem.js';

/**
 * Projector for the Inventory Item Read Model.
 * It listens to events emitted from the Event Store and updates the
 * materialized view (read model) in MongoDB.
 */
class InventoryProjector {
  constructor() {
    // Subscribe to relevant events
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
      !Number.isInteger(event.version) ||
      event.version < 0
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
      // Check whether this item already exists
      const existingItem = await InventoryItemReadModel.findOne({
        aggregateId: event.aggregateId
      });

      if (existingItem) {
        console.log(
          `[Projector] Ignoring duplicate ITEM_CREATED for ${event.aggregateId}`
        );
        return;
      }

      // Validate initial inventory quantity
      const quantity = event.payload.quantity ?? 0;

      if (!Number.isInteger(quantity) || quantity < 0) {
        console.error(
          `[Projector Error] Invalid initial quantity for ${event.aggregateId}`
        );
        return;
      }

      const newItem = new InventoryItemReadModel({
        aggregateId: event.aggregateId,
        sku: event.payload.sku,
        name: event.payload.name,
        location: event.payload.location,
        quantity: quantity,
        lastProcessedVersion: event.version,
        status: quantity === 0 ? 'OUT_OF_STOCK' : 'AVAILABLE'
      });

      await newItem.save();

      console.log(
        `[Projector] Created read model for item ${event.aggregateId}`
      );
    } catch (error) {
      // Handle duplicate creation caused by concurrent events
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

    // Validate quantity change
    const quantityChange = event.payload.quantityChange;

    if (!Number.isInteger(quantityChange)) {
      console.error(
        `[Projector Error] Invalid quantityChange for ${event.aggregateId}`
      );
      return;
    }

    try {
      // Find the current read model
      const item = await InventoryItemReadModel.findOne({
        aggregateId: event.aggregateId
      });

      if (!item) {
        console.error(
          `[Projector Error] Item ${event.aggregateId} not found for stock update.`
        );
        return;
      }

      // Idempotency check: ignore duplicate or old events
      if (event.version <= item.lastProcessedVersion) {
        console.log(
          `[Projector] Ignoring duplicate or old event for ${event.aggregateId}`
        );
        return;
      }

      // Calculate new stock quantity
      const newQuantity = item.quantity + quantityChange;

      // Prevent negative inventory
      if (newQuantity < 0) {
        console.error(
          `[Projector Error] Stock cannot become negative for ${event.aggregateId}`
        );
        return;
      }

      // Apply the stock update
      item.quantity = newQuantity;
      item.lastProcessedVersion = event.version;

      // Update status based on stock
      if (newQuantity === 0) {
        item.status = 'OUT_OF_STOCK';
      } else {
        item.status = 'AVAILABLE';
      }

      await item.save();

      console.log(
        `[Projector] Updated stock for item ${event.aggregateId}. New Qty: ${item.quantity}`
      );
    } catch (error) {
      console.error(
        `[Projector Error] Failed to project stock update: ${error.message}`
      );
    }
  }
}

export default new InventoryProjector();
