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
    // Subscribe to relevant events
    EventBus.subscribe('ITEM_CREATED', this.onItemCreated.bind(this));
    EventBus.subscribe('STOCK_ADDED', this.onStockUpdated.bind(this));
    EventBus.subscribe('STOCK_REMOVED', this.onStockUpdated.bind(this));
    
    console.log('[Projector] InventoryProjector initialized and listening for events.');
  }

  async onItemCreated(event) {
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

      // Day 19 Cache Invalidation: Invalidate any stale read model cache entry
      await cacheService.del(`cache:inventory:${event.aggregateId}`);

      console.log(`[Projector] Verified/Created read model for item ${event.aggregateId} at version ${event.version}`);
    } catch (error) {
      console.error(`[Projector Error] Failed to project ITEM_CREATED: ${error.message}`);
    }
  }

  async onStockUpdated(event) {
    try {
      // Find the current read model
      const item = await InventoryItemReadModel.findOne({ aggregateId: event.aggregateId });
      
      if (!item) {
        console.error(`[Projector Error] Item ${event.aggregateId} not found for stock update.`);
        return;
      }

      // Idempotency check: Ignore events we've already processed
      if (event.version <= item.lastProcessedVersion) {
        console.log(`[Projector] Ignoring duplicate or old event for ${event.aggregateId}`);
        return;
      }

      // Apply the change
      item.quantity += event.payload.quantityChange;
      item.lastProcessedVersion = event.version;
      
      // Update status based on stock
      if (item.quantity <= 0) {
        item.status = 'OUT_OF_STOCK';
      } else {
        item.status = 'AVAILABLE';
      }

      await item.save();

      // Day 19 Cache Invalidation: Immediately invalidate cache so next read fetches new stock
      await cacheService.del(`cache:inventory:${event.aggregateId}`);

      console.log(`[Projector] Updated stock for item ${event.aggregateId}. New Qty: ${item.quantity}`);
    } catch (error) {
      console.error(`[Projector Error] Failed to project stock update: ${error.message}`);
    }
  }
}

export default new InventoryProjector();
