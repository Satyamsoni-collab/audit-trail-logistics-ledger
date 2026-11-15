
import mongoose from 'mongoose';

const inventoryItemSchema = new mongoose.Schema({
  // Event Store aggregate identifier
  aggregateId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    trim: true
  },

  sku: {
    type: String,
    required: true,
    trim: true,
    minlength: [1, 'SKU cannot be empty'],
    index: true
  },

  name: {
    type: String,
    required: true,
    trim: true,
    minlength: [1, 'Inventory name cannot be empty']
  },

  quantity: {
    type: Number,
    required: true,
    default: 0,
    min: [0, 'Inventory quantity cannot be negative'],
    validate: {
      validator: Number.isSafeInteger,
      message: 'Inventory quantity must be a safe integer'
    }
  },

  location: {
    type: String,
    required: true,
    trim: true,
    minlength: [1, 'Inventory location cannot be empty']
  },

  status: {
    type: String,
    enum: ['AVAILABLE', 'RESERVED', 'OUT_OF_STOCK', 'DISCONTINUED'],
    default: 'AVAILABLE'
  },

  // Last processed event version for idempotency
  lastProcessedVersion: {
    type: Number,
    required: true,
    default: 0,
    min: [0, 'Event version cannot be negative'],
    validate: {
      validator: Number.isSafeInteger,
      message: 'Event version must be a safe integer'
    }
  }
}, {
  timestamps: true
});

export default mongoose.model(
  'InventoryItemReadModel',
  inventoryItemSchema
);
