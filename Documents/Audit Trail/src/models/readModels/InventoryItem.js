
import mongoose from 'mongoose';


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
      validator: Number.isInteger,
      message: 'Inventory quantity must be an integer'
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

  // Stores the last processed event version for idempotency
  lastProcessedVersion: {
    type: Number,
    required: true,
    default: 0,
    min: [0, 'Event version cannot be negative'],
    validate: {
      validator: Number.isInteger,
      message: 'Event version must be an integer'
    }
  }
}, {
  timestamps: true // Tracks when the read model was last updated
});

export default mongoose.model('InventoryItemReadModel', inventoryItemSchema);
