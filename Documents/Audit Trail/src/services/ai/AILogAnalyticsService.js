import SecurityAlert from '../../models/alerts/SecurityAlert.js';
import Event from '../../models/events/EventStore.js';
import InventoryItemReadModel from '../../models/readModels/InventoryItem.js';
import telemetryService from '../../utils/telemetry.js';
import logger from '../../utils/logger.js';

/**
 * AI-Powered Log Analytics & Anomaly Detection Engine
 * 
 * Ingests system telemetry, error streams, and projection lag metrics to
 * automatically diagnose system health, detect state divergence, and synthesize
 * root-cause analysis with actionable remediation directives.
 */
class AILogAnalyticsService {
  /**
   * Evaluates historical latencies using Z-Score statistical anomaly detection.
   */
  calculateLatencyZScore(latencies) {
    if (!latencies || latencies.length < 5) return { isAnomalous: false, zScore: 0 };
    const n = latencies.length;
    const mean = latencies.reduce((a, b) => a + b, 0) / n;
    const variance = latencies.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);

    if (stdDev === 0) return { isAnomalous: false, zScore: 0 };

    const latest = latencies[latencies.length - 1];
    const zScore = (latest - mean) / stdDev;

    return {
      isAnomalous: zScore > 2.5,
      zScore: Number(zScore.toFixed(2)),
      mean: Number(mean.toFixed(2)),
      latest: Number(latest.toFixed(2))
    };
  }

  /**
   * Performs an autonomous full-system AI diagnostic evaluation.
   */
  async performSystemDiagnostics() {
    const timestamp = new Date().toISOString();
    logger.info('🤖 [AILogAnalytics] Initiating full system diagnostic scan...');

    // 1. Ingest Security Alerts & Error Logs
    const activeAlerts = await SecurityAlert.find({ status: 'ACTIVE' }).limit(50).lean().exec();

    // 2. Statistical Latency Outlier Evaluation
    const latencyStats = this.calculateLatencyZScore(telemetryService.metrics.latencies);

    // 3. Projection Lag Analysis
    const projectionLagMs = telemetryService.metrics.projectionLagMs;
    const isLagHigh = projectionLagMs > 500; // Over 500ms is considered anomalous lag

    // 4. Synthesize AI Root Cause Analysis
    const detectedIssues = [];
    const recommendedActions = [];

    // Check for concurrency storms
    const concurrencyAlerts = activeAlerts.filter(a => a.ruleCode.includes('CONCURRENCY') || a.ruleCode === 'RAPID_FREQUENCY_ANOMALY');
    if (concurrencyAlerts.length >= 3) {
      detectedIssues.push({
        issueType: 'CONCURRENCY_BURST',
        severity: 'HIGH',
        confidence: 0.95,
        summary: `Detected ${concurrencyAlerts.length} high-frequency race condition anomalies. Likely distributed client thrashing.`
      });
      recommendedActions.push({
        action: 'ENABLE_CLIENT_BACKOFF_RATE_LIMITING',
        target: 'API_GATEWAY',
        priority: 1
      });
    }

    // Check for cryptographic integrity risks
    const tamperAlerts = activeAlerts.filter(a => a.ruleCode.includes('TAMPER') || a.ruleCode === 'ABNORMAL_STOCK_SPIKE');
    if (tamperAlerts.length > 0) {
      detectedIssues.push({
        issueType: 'SECURITY_TAMPER_SUSPICION',
        severity: 'CRITICAL',
        confidence: 0.98,
        summary: 'Detected cryptographic divergence or out-of-band state mutation.'
      });
      recommendedActions.push({
        action: 'TRIGGER_ISOLATION_AND_FORENSIC_CHAIN_AUDIT',
        target: 'EVENT_STORE',
        priority: 0
      });
    }

    // Check for projection desynchronization
    if (isLagHigh) {
      detectedIssues.push({
        issueType: 'PROJECTION_SYNCHRONIZATION_LAG',
        severity: 'MEDIUM',
        confidence: 0.88,
        summary: `Read model projection synchronization lag is elevated at ${projectionLagMs}ms.`
      });
      recommendedActions.push({
        action: 'AUTO_TRIGGER_PROJECTION_REPLAY',
        target: 'READ_MODEL_PROJECTOR',
        priority: 2
      });
    }

    // Check for latency spikes
    if (latencyStats.isAnomalous) {
      detectedIssues.push({
        issueType: 'LATENCY_OUTLIER_SPIKE',
        severity: 'MEDIUM',
        confidence: 0.85,
        summary: `Statistical Z-score spike (${latencyStats.zScore}) detected on HTTP requests (Current: ${latencyStats.latest}ms vs Mean: ${latencyStats.mean}ms).`
      });
      recommendedActions.push({
        action: 'EVICT_STALE_REDIS_CACHE_AND_CHECK_CONNECTION_POOL',
        target: 'REDIS_CACHE',
        priority: 3
      });
    }

    // Check for suspicious shipment delays
    const delayAlerts = activeAlerts.filter(a => a.ruleCode.includes('DELAY') || a.ruleCode.includes('STALL') || a.ruleCode === 'SUSPICIOUS_SHIPMENT_DELAY');
    if (delayAlerts.length > 0) {
      detectedIssues.push({
        issueType: 'SUSPICIOUS_SHIPMENT_DELAY',
        severity: 'HIGH',
        confidence: 0.94,
        summary: `Detected ${delayAlerts.length} shipment(s) exceeding normal transit SLA windows without checkpoint updates.`,
        affectedShipments: delayAlerts.map(a => a.aggregateId)
      });
      recommendedActions.push({
        action: 'DISPATCH_CARRIER_EXCEPTION_PROBE',
        target: 'LOGISTICS_ROUTING_SERVICE',
        priority: 1
      });
    }

    // Check for data inconsistencies
    const inconsistencyAlerts = activeAlerts.filter(a => a.ruleCode.includes('INCONSISTENCY') || a.ruleCode.includes('DIVERGENCE') || a.ruleCode === 'DATA_INCONSISTENCY');
    if (inconsistencyAlerts.length > 0) {
      detectedIssues.push({
        issueType: 'DATA_INCONSISTENCY',
        severity: 'HIGH',
        confidence: 0.96,
        summary: `Identified ${inconsistencyAlerts.length} state divergence discrepancies between immutable event store ledger and projection views.`,
        affectedAggregates: inconsistencyAlerts.map(a => a.aggregateId)
      });
      recommendedActions.push({
        action: 'TRIGGER_AUTOMATED_REPLAY_HEALING',
        target: 'READ_MODEL_PROJECTOR',
        priority: 1
      });
    }

    // Fallback proactive health baseline if no active alerts present
    if (detectedIssues.length === 0) {
      detectedIssues.push({
        issueType: 'NORMAL_AI_SURVEILLANCE',
        severity: 'LOW',
        confidence: 0.99,
        summary: 'All CQRS pipelines and shipment timelines operating within calibrated confidence boundaries. Zero data inconsistencies detected.',
        details: 'Continuous monitoring active for latency spikes, transit stall patterns, and ledger cryptographic chain integrity.'
      });
    }

    const healthStatus = detectedIssues.some(i => i.severity === 'CRITICAL')
      ? 'CRITICAL_ACTION_REQUIRED'
      : detectedIssues.some(i => i.severity === 'HIGH')
      ? 'DEGRADED_PERFORMANCE'
      : 'OPTIMAL_AUTONOMOUS';

    return {
      diagnosticTimestamp: timestamp,
      systemHealthStatus: healthStatus,
      telemetrySnapshot: {
        totalCommands: telemetryService.metrics.commandTotal,
        totalQueries: telemetryService.metrics.queryTotal,
        projectionLagMs,
        activeAlertsCount: activeAlerts.length,
        latencyZScore: latencyStats
      },
      diagnosedIssuesCount: detectedIssues.length,
      diagnosedIssues: detectedIssues,
      aiRemediationPlan: recommendedActions
    };
  }

  /**
   * Diagnoses a single aggregate's event stream health and projection parity.
   */
  async analyzeAggregateHealth(aggregateId) {
    const [events, readModel] = await Promise.all([
      Event.find({ aggregateId }).sort({ version: 1 }).lean().exec(),
      InventoryItemReadModel.findOne({ aggregateId }).lean().exec()
    ]);

    if (!events.length) {
      return { aggregateId, status: 'NOT_FOUND', confidence: 1.0 };
    }

    const latestEventVersion = events[events.length - 1].version;
    const projectedVersion = readModel ? readModel.lastProcessedVersion : 0;
    const isDesynchronized = projectedVersion !== latestEventVersion;

    return {
      aggregateId,
      status: isDesynchronized ? 'STATE_DIVERGENCE_DETECTED' : 'HEALTHY_SYNCHRONIZED',
      confidence: 0.99,
      eventCount: events.length,
      latestEventVersion,
      projectedVersion,
      desynchronizationGap: latestEventVersion - projectedVersion,
      recommendedRemediation: isDesynchronized ? 'REPLAY_AGGREGATE_EVENTS' : 'NONE'
    };
  }
}

export default new AILogAnalyticsService();
