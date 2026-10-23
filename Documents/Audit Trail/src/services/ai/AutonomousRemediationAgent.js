import crypto from 'crypto';
import RemediationActionLog from '../../models/alerts/RemediationActionLog.js';
import AILogAnalyticsService from './AILogAnalyticsService.js';
import AuditTrailService from '../AuditTrailService.js';
import InventoryItemReadModel from '../../models/readModels/InventoryItem.js';
import cacheService from '../../config/redis.js';
import logger from '../../utils/logger.js';

/**
 * Autonomous Incident Remediation Agent
 * 
 * An autonomous SRE supervisor that monitors system failure signals and executes
 * self-healing protocols (automated event replay, cache eviction, circuit breaking)
 * while maintaining an immutable audit log of all actions.
 */
class AutonomousRemediationAgent {
  constructor() {
    this.circuitBreaker = {
      state: 'CLOSED', // 'CLOSED' (Normal), 'OPEN' (Tripped/Blocking), 'HALF_OPEN'
      openedAt: null,
      cooldownMs: 30000,
      reason: null
    };

    logger.info('🛡️ [RemediationAgent] Autonomous Remediation Agent initialized.');
  }

  /**
   * Evaluates current circuit breaker status.
   */
  isCircuitOpen() {
    if (this.circuitBreaker.state === 'OPEN') {
      const elapsed = Date.now() - this.circuitBreaker.openedAt;
      if (elapsed > this.circuitBreaker.cooldownMs) {
        this.circuitBreaker.state = 'HALF_OPEN';
        logger.info('🟡 [CircuitBreaker] Transitioned from OPEN to HALF_OPEN (Probing recovery).');
        return false;
      }
      return true;
    }
    return false;
  }

  /**
   * Trips the circuit breaker during severe database starvation or critical threat.
   */
  tripCircuit(reason, cooldownMs = 30000) {
    this.circuitBreaker.state = 'OPEN';
    this.circuitBreaker.openedAt = Date.now();
    this.circuitBreaker.cooldownMs = cooldownMs;
    this.circuitBreaker.reason = reason;

    logger.error(`🚨 [CircuitBreaker] TRIPPED! Reason: ${reason} (Cooldown: ${cooldownMs / 1000}s)`);

    this.recordAction({
      triggerIssue: 'CRITICAL_SYSTEM_STRAIN',
      targetEntity: 'GLOBAL_API_GATEWAY',
      actionTaken: 'CIRCUIT_BREAKER_TRIGGER',
      outcome: 'SUCCESS',
      details: { reason, cooldownMs }
    });
  }

  /**
   * Resets circuit breaker to normal operation.
   */
  resetCircuit() {
    this.circuitBreaker.state = 'CLOSED';
    this.circuitBreaker.openedAt = null;
    this.circuitBreaker.reason = null;
    logger.info('🟢 [CircuitBreaker] Reset to CLOSED state. Normal operations resumed.');
  }

  /**
   * Heals an aggregate with state divergence by replaying its event stream and refreshing read models.
   */
  async healAggregateState(aggregateId) {
    logger.info(`🔄 [RemediationAgent] Initiating autonomous self-healing for aggregate: ${aggregateId}`);
    try {
      // 1. Reconstruct true state from Event Store
      const sourceOfTruth = await AuditTrailService.replayState(aggregateId);

      if (!sourceOfTruth) {
        throw new Error(`Aggregate ${aggregateId} has no event history to replay.`);
      }

      // 2. Repair Read Model Materialized View
      await InventoryItemReadModel.findOneAndUpdate(
        { aggregateId },
        {
          $set: {
            quantity: sourceOfTruth.quantity,
            lastProcessedVersion: sourceOfTruth.version,
            status: sourceOfTruth.quantity === 0 ? 'OUT_OF_STOCK' : 'AVAILABLE'
          }
        },
        { upsert: true }
      );

      // 3. Purge Stale Redis Cache
      await cacheService.del(`cache:inventory:${aggregateId}`);

      // 4. Log Immutable Audit Record
      await this.recordAction({
        triggerIssue: 'PROJECTION_DESYNCHRONIZATION',
        targetEntity: aggregateId,
        actionTaken: 'REPAIR_DESYNCHRONIZED_READ_MODEL',
        outcome: 'SUCCESS',
        details: {
          recoveredVersion: sourceOfTruth.version,
          recoveredQuantity: sourceOfTruth.quantity
        }
      });

      logger.info(`✅ [RemediationAgent] Successfully healed aggregate ${aggregateId} to version ${sourceOfTruth.version}`);
      return { success: true, aggregateId, recoveredState: sourceOfTruth };
    } catch (err) {
      logger.error(`❌ [RemediationAgent] Self-healing failed for ${aggregateId}: ${err.message}`);
      await this.recordAction({
        triggerIssue: 'PROJECTION_DESYNCHRONIZATION',
        targetEntity: aggregateId,
        actionTaken: 'AUTO_REPLAY_PROJECTION',
        outcome: 'FAILED',
        details: { error: err.message }
      });
      return { success: false, error: err.message };
    }
  }

  /**
   * Executes a full autonomous diagnostic scan and applies approved self-healing routines.
   */
  async runAutonomousCycle() {
    const diagnostics = await AILogAnalyticsService.performSystemDiagnostics();
    const executedRemediations = [];

    for (const plan of diagnostics.aiRemediationPlan) {
      if (plan.action === 'EVICT_STALE_REDIS_CACHE_AND_CHECK_CONNECTION_POOL') {
        await cacheService.delPattern('cache:inventory:*');
        executedRemediations.push({
          action: 'EVICT_CORRUPTED_CACHE',
          target: 'ALL_INVENTORY_CACHES',
          status: 'EXECUTED'
        });
      }
    }

    return {
      cycleTimestamp: new Date().toISOString(),
      systemHealth: diagnostics.systemHealthStatus,
      detectedIssues: diagnostics.diagnosedIssues,
      remediationsApplied: executedRemediations
    };
  }

  /**
   * Persists an immutable log of autonomous remediation actions.
   */
  async recordAction({ triggerIssue, targetEntity, actionTaken, outcome, details }) {
    try {
      const actionDoc = new RemediationActionLog({
        actionId: `REM-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
        triggerIssue,
        targetEntity,
        actionTaken,
        outcome,
        details
      });
      await actionDoc.save();
    } catch (err) {
      logger.error(`[RemediationAgent Log Error] Failed to persist remediation record: ${err.message}`);
    }
  }

  /**
   * Retrieves recent autonomous remediation history.
   */
  async getRemediationHistory(limit = 20) {
    return RemediationActionLog.find().sort({ executedAt: -1 }).limit(limit).lean().exec();
  }
}

export default new AutonomousRemediationAgent();
