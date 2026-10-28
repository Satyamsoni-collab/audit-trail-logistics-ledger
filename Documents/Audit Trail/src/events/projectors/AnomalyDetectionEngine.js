import crypto from 'crypto';
import EventBus from '../EventBus.js';
import SecurityAlert from '../../models/alerts/SecurityAlert.js';
import logger from '../../utils/logger.js';

/**
 * AnomalyDetectionEngine
 * 
 * Real-time monitoring rule engine subscribed to the event stream.
 * Detects suspicious inventory adjustments, unauthorized actor tampering,
 * or abnormal velocity flurries in real time.
 */
class AnomalyDetectionEngine {
  constructor() {
    this.recentAdjustments = new Map(); // aggregateId -> [{ timestamp, qty }]

    EventBus.subscribe('ITEM_CREATED', this.inspectEvent.bind(this));
    EventBus.subscribe('STOCK_ADDED', this.inspectEvent.bind(this));
    EventBus.subscribe('STOCK_REMOVED', this.inspectEvent.bind(this));
    EventBus.subscribe('TRANSIT_UPDATE', this.inspectEvent.bind(this));
    EventBus.subscribe('SHIPMENT_DISPATCHED', this.inspectEvent.bind(this));
    EventBus.subscribe('IN_TRANSIT', this.inspectEvent.bind(this));
    EventBus.subscribe('DELIVERED', this.inspectEvent.bind(this));

    logger.info('🛡️ [AnomalyEngine] Real-time Anomaly Detection Engine active.');
  }

  async inspectEvent(event) {
    try {
      const alerts = [];

      // --- Rule 1: Suspicious High-Volume Adjustment Spike ---
      if (event.payload && typeof event.payload.quantityChange === 'number') {
        const change = event.payload.quantityChange;
        if (Math.abs(change) >= 500) {
          alerts.push({
            severity: 'HIGH',
            ruleCode: 'ABNORMAL_STOCK_SPIKE',
            message: `Abnormal stock movement detected: ${change} units in a single event.`,
            details: { quantityChange: change, threshold: 500 }
          });
        }

        if (change <= -250) {
          alerts.push({
            severity: 'HIGH',
            ruleCode: 'SUSPICIOUS_DRAIN',
            message: `Large negative inventory depletion detected: ${change} units.`,
            details: { quantityChange: change, threshold: -250 }
          });
        }
      }

      // --- Rule 2: Unauthenticated or Anonymous Actor on Write Pipeline ---
      if (!event.actor || event.actor === 'anonymous-user' || event.actor === 'unknown') {
        alerts.push({
          severity: 'MEDIUM',
          ruleCode: 'UNAUTHORIZED_ANONYMOUS_ACTOR',
          message: `Critical event executed by unverified actor: "${event.actor || 'N/A'}".`,
          details: { actor: event.actor }
        });
      }

      // --- Rule 3: Rapid Velocity / Thrashing Anomaly ---
      const now = Date.now();
      const history = this.recentAdjustments.get(event.aggregateId) || [];
      // Keep only movements within the last 5 seconds
      const recentWindow = history.filter(item => now - item.timestamp < 5000);
      recentWindow.push({ timestamp: now, version: event.version });
      this.recentAdjustments.set(event.aggregateId, recentWindow);

      if (recentWindow.length >= 4) {
        alerts.push({
          severity: 'MEDIUM',
          ruleCode: 'RAPID_FREQUENCY_ANOMALY',
          message: `High-frequency inventory mutation detected: ${recentWindow.length} events in < 5 seconds.`,
          details: { eventCountInWindow: recentWindow.length, windowMs: 5000 }
        });
      }

      // --- Rule 4: Suspicious Shipment Delay / Transit Stall ---
      if (
        event.payload &&
        (event.payload.status === 'DELAYED' ||
         event.payload.delayHours > 12 ||
         (typeof event.payload.notes === 'string' && event.payload.notes.toLowerCase().includes('delay')))
      ) {
        alerts.push({
          severity: 'HIGH',
          ruleCode: 'SUSPICIOUS_SHIPMENT_DELAY',
          message: `Transit delay SLA violation flagged on shipment ${event.aggregateId}: ${event.payload.notes || 'Checkpoint timeout'}.`,
          details: {
            shipmentId: event.aggregateId,
            status: event.payload.status,
            location: event.payload.location,
            delayHours: event.payload.delayHours || 14
          }
        });
      }

      // --- Rule 5: Data Inconsistency / State Divergence ---
      if (
        event.payload &&
        (event.payload.inconsistencyDetected === true ||
         event.payload.checksumMismatch === true ||
         (event.previousHash && event.previousHash === 'CORRUPTED_PARENT'))
      ) {
        alerts.push({
          severity: 'CRITICAL',
          ruleCode: 'DATA_INCONSISTENCY',
          message: `Cryptographic or projection state divergence detected for aggregate ${event.aggregateId}.`,
          details: {
            aggregateId: event.aggregateId,
            expectedVersion: event.version,
            discrepancy: event.payload.discrepancy || 'Version sequencing irregularity'
          }
        });
      }

      // --- Save alerts & Emit security warnings ---
      for (const alertData of alerts) {
        const alertDoc = new SecurityAlert({
          alertId: `ALT-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
          severity: alertData.severity,
          ruleCode: alertData.ruleCode,
          message: alertData.message,
          aggregateId: event.aggregateId,
          eventType: event.eventType,
          actor: event.actor,
          details: alertData.details
        });

        await alertDoc.save();

        const logMsg = `🚨 [SECURITY ALERT - ${alertData.severity}] ${alertData.ruleCode} on ${event.aggregateId}: ${alertData.message}`;
        if (alertData.severity === 'HIGH' || alertData.severity === 'CRITICAL') {
          logger.error(logMsg);
        } else {
          logger.warn(logMsg);
        }
      }
    } catch (err) {
      logger.error(`[AnomalyEngine Error] Evaluation failed: ${err.message}`);
    }
  }
}

export default new AnomalyDetectionEngine();
