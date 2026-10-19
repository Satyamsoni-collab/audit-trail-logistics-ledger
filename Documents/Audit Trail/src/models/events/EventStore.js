import mongoose from 'mongoose';

/**
 * Event Store Schema
 * 
 * This schema acts as an Append-Only log for our Event-Sourced architecture.
 * It is IMMUTABLE. We never update or delete these records.
 * 
 * Fields:
 * - aggregateId: The ID of the domain entity this event belongs to (e.g., Inventory Item ID).
 * - aggregateType: The type of the domain entity (e.g., 'InventoryItem').
 * - eventType: The specific event that occurred (e.g., 'ITEM_CREATED', 'STOCK_UPDATED').
 * - payload: The arbitrary data associated with the event.
 * - version: Concurrency control to prevent race conditions when appending events to the same aggregate.
 * - actor: The system or user that triggered the event (for auditing).
 * - timestamp: When the event occurred.
 */
const eventStoreSchema = new mongoose.Schema({
  aggregateId: {
    type: String,
    required: true,
    index: true // Index for fast retrieval of an aggregate's event stream
  },
  aggregateType: {
    type: String,
    required: true,
    enum: ['InventoryItem', 'Shipment'] // Expand as needed
  },
  eventType: {
    type: String,
    required: true,
  },
  payload: {
    type: mongoose.Schema.Types.Mixed, // Allows flexible schema for different event types
    required: true
  },
  version: {
    type: Number,
    required: true
  },
  actor: {
    type: String,
    required: true, // e.g., 'system', 'user-id-123'
    default: 'system'
  },
  timestamp: {
    type: Date,
    default: Date.now,
    immutable: true // Enforce immutability
  }
}, {
  timestamps: false, // We manually manage timestamp to ensure it's immutable
  versionKey: false
});

// Compound unique index to enforce optimistic concurrency control
// An aggregate cannot have two events with the same version number
eventStoreSchema.index({ aggregateId: 1, version: 1 }, { unique: true });

export default mongoose.model('Event', eventStoreSchema);
