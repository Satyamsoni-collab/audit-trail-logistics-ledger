import mongoose from 'mongoose';

/**
 * EventArchive Schema (Cold Storage)
 * 
 * Stores historical events migrated from the hot active EventStore collection.
 * Highly compressed and partitioned for audit compliance, regulatory retention,
 * and cost-efficient cold storage.
 */
const eventArchiveSchema = new mongoose.Schema({
  originalEventId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  aggregateId: {
    type: String,
    required: true,
    index: true
  },
  aggregateType: {
    type: String,
    required: true
  },
  eventType: {
    type: String,
    required: true
  },
  payload: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  version: {
    type: Number,
    required: true
  },
  actor: {
    type: String,
    required: true
  },
  originalTimestamp: {
    type: Date,
    required: true,
    index: true
  },
  archivedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  archiveBatchId: {
    type: String,
    required: true,
    index: true
  },
  checksum: {
    type: String,
    required: true
  }
}, {
  timestamps: false,
  versionKey: false
});

// Indexing for regulatory and audit retrieval
eventArchiveSchema.index({ aggregateId: 1, version: 1 }, { unique: true });
eventArchiveSchema.index({ originalTimestamp: -1 });

export default mongoose.model('EventArchive', eventArchiveSchema);
