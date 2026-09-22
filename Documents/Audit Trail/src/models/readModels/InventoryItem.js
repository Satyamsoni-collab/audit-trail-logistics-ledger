import mongoose from 'mongoose';

/**
 * Inventory Item Read Model (Projection)
 * 
 * This schema represents the "Current State" of an inventory item.
 * It is heavily optimized for queries (reads) as per the CQRS pattern.
 * This collection is updated asynchronously by event listeners projecting 
 * events from the Event Store.
 */
const inventoryItemSchema = new mongoose.Schema({
  // We use the aggregateId from the Event Store as the primary identifier here
  aggregateId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  sku: {
    type: String,
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    default: 0,
    min: 0 // Cannot have negative inventory in this system
  },
  location: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['AVAILABLE', 'RESERVED', 'OUT_OF_STOCK', 'DISCONTINUED'],
    default: 'AVAILABLE'
  },
  // We store the last processed event version to ensure we don't process 
  // the same event twice or process them out of order (Idempotency).
  lastProcessedVersion: {
    type: Number,
    required: true,
    default: 0
  }
}, {
  timestamps: true // Tracks when the read model was last updated
});

export default mongoose.model('InventoryItemReadModel', inventoryItemSchema);
