import mongoose from 'mongoose';

/**
 * RemediationActionLog Schema
 * 
 * Immutable audit trail for all autonomous remediation decisions and self-healing
 * protocols executed by the Autonomous Incident Remediation Agent.
 */
const remediationActionLogSchema = new mongoose.Schema({
  actionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  triggerIssue: {
    type: String,
    required: true,
    index: true
  },
  targetEntity: {
    type: String,
    required: true,
    index: true
  },
  actionTaken: {
    type: String,
    required: true,
    enum: [
      'AUTO_REPLAY_PROJECTION',
      'EVICT_CORRUPTED_CACHE',
      'CIRCUIT_BREAKER_TRIGGER',
      'QUARANTINE_AGGREGATE',
      'REPAIR_DESYNCHRONIZED_READ_MODEL'
    ]
  },
  outcome: {
    type: String,
    enum: ['SUCCESS', 'PARTIAL_SUCCESS', 'FAILED'],
    default: 'SUCCESS'
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  executedAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: false,
  versionKey: false
});

export default mongoose.model('RemediationActionLog', remediationActionLogSchema);
