
import mongoose from 'mongoose';

const eventStoreSchema = new mongoose.Schema(
  {
    aggregateId: {
      type: String,
      required: true,
      trim: true
    },

    aggregateType: {
      type: String,
      required: true,
      enum: ['InventoryItem', 'Shipment']
    },

    eventType: {
      type: String,
      required: true,
      trim: true,
      enum: [
        'ITEM_CREATED',
        'STOCK_ADDED',
        'STOCK_REMOVED',
        'SHIPMENT_CREATED',
        'SHIPMENT_UPDATED',
        'SHIPMENT_DISPATCHED',
        'SHIPMENT_DELIVERED'
      ]
    },

    payload: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    },

    version: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isSafeInteger,
        message: 'Event version must be a safe integer'
      }
    },

    actor: {
      type: String,
      required: true,
      default: 'system',
      trim: true
    },

    timestamp: {
      type: Date,
      default: Date.now,
      immutable: true
    },

    previousHash: {
      type: String,
      default: 'GENESIS',
      immutable: true
    },

    hash: {
      type: String,
      required: true,
      immutable: true
    }
  },
  {
    timestamps: false,
    versionKey: false,
    strict: true
  }
);

// Ensure each aggregate has a unique event version.
eventStoreSchema.index(
  { aggregateId: 1, version: 1 },
  { unique: true }
);

// Fast chronological history retrieval.
eventStoreSchema.index({ aggregateId: 1, timestamp: 1 });

// Event type analytics.
eventStoreSchema.index({ eventType: 1, timestamp: -1 });

// Prevent saving changes to existing event documents.
eventStoreSchema.pre('save', function () {
  if (!this.isNew) {
    throw new Error('Event records are immutable');
  }
});

// Prevent normal Mongoose query-based updates, replacements and deletions.
eventStoreSchema.pre(
  [
    'updateOne',
    'updateMany',
    'findOneAndUpdate',
    'replaceOne',
    'findOneAndReplace',
    'deleteOne',
    'deleteMany',
    'findOneAndDelete'
  ],
  function () {
    throw new Error('Event records cannot be updated or deleted');
  }
);

const Event =
  mongoose.models.Event ||
  mongoose.model('Event', eventStoreSchema);

export default Event;
