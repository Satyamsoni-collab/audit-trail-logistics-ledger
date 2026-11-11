
import mongoose from 'mongoose';

/**
 * Snapshot Schema
 * Stores materialized aggregate states at specific versions.
 * Helps optimize event replay performance.
 */

const snapshotSchema = new mongoose.Schema(
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

    version: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: 'Snapshot version must be an integer'
      }
    },

    state: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    },

    timestamp: {
      type: Date,
      default: Date.now,
      immutable: true
    }
  },
  {
    timestamps: false,
    versionKey: false
  }
);

// Prevent duplicate snapshots for the same aggregate and version
snapshotSchema.index(
  { aggregateId: 1, version: 1 },
  { unique: true }
);

// Quickly retrieve the latest snapshot
snapshotSchema.index({ aggregateId: 1, version: -1 });

// Reuse existing model
const Snapshot =
  mongoose.models.Snapshot ||
  mongoose.model('Snapshot', snapshotSchema);

export default Snapshot;
  