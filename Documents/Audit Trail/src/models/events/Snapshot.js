import mongoose from 'mongoose';

/**
 * Snapshot Schema
 * Used to store materialized states of aggregates at specific versions.
 * This drastically speeds up replay time for long event streams.
 */
const snapshotSchema = new mongoose.Schema({
  aggregateId: {
    type: String,
    required: true,
    index: true
  },
  aggregateType: {
    type: String,
    required: true
  },
  version: {
    type: Number,
    required: true
  },
  state: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: false,
  versionKey: false
});

// Index to quickly fetch the latest snapshot for an aggregate
snapshotSchema.index({ aggregateId: 1, version: -1 });

export default mongoose.model('Snapshot', snapshotSchema);
