import mongoose from 'mongoose';

/**
 * SecurityAlert Schema
 * 
 * Stores real-time anomalies, policy violations, and suspicious event activities
 * detected by the Anomaly Detection Engine.
 */
const securityAlertSchema = new mongoose.Schema({
  alertId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  severity: {
    type: String,
    required: true,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    default: 'MEDIUM'
  },
  ruleCode: {
    type: String,
    required: true,
    index: true
  },
  message: {
    type: String,
    required: true
  },
  aggregateId: {
    type: String,
    required: true,
    index: true
  },
  eventType: {
    type: String,
    required: true
  },
  actor: {
    type: String,
    default: 'system'
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'ACKNOWLEDGED', 'RESOLVED'],
    default: 'ACTIVE',
    index: true
  },
  detectedAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true,
  versionKey: false
});

export default mongoose.model('SecurityAlert', securityAlertSchema);
