import crypto from 'crypto';
import EventStoreService from '../EventStoreService.js';
import SecurityAlert from '../../models/alerts/SecurityAlert.js';
import InventoryItemReadModel from '../../models/readModels/InventoryItem.js';

class ComplianceReportService {
  /**
   * Compiles an end-to-end regulatory compliance report for an aggregate item.
   * 
   * @param {String} aggregateId
   * @returns {Promise<Object>} Structured compliance report
   */
  static async generateAuditReport(aggregateId) {
    const events = await EventStoreService.getEventStream(aggregateId);
    
    if (!events || events.length === 0) {
      return null;
    }

    // 1. Verify Cryptographic Integrity
    const integrityAudit = await EventStoreService.verifyChainIntegrity(aggregateId);

    // 2. Fetch current projection read model
    const currentItem = await InventoryItemReadModel.findOne({ aggregateId }).lean().exec();

    // 3. Compile Actor and Movement Summaries
    const actorActivity = {};
    let totalStockAdded = 0;
    let totalStockRemoved = 0;

    const movementLedger = events.map(ev => {
      const actor = ev.actor || 'system';
      actorActivity[actor] = (actorActivity[actor] || 0) + 1;

      const change = ev.payload?.quantityChange || 0;
      if (change > 0) totalStockAdded += change;
      if (change < 0) totalStockRemoved += Math.abs(change);

      return {
        version: ev.version,
        eventType: ev.eventType,
        actor,
        quantityChange: change,
        previousHash: ev.previousHash || 'GENESIS',
        hash: ev.hash || 'N/A',
        timestamp: ev.timestamp
      };
    });

    // 4. Fetch security alerts
    const alerts = await SecurityAlert.find({ aggregateId }).sort({ detectedAt: -1 }).lean().exec();

    const reportId = `REP-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    return {
      reportMetadata: {
        reportId,
        generatedAt: new Date().toISOString(),
        standard: 'SOC2-Type-II / ISO-27001 Regulatory Ledger',
        chainIntegrityStatus: integrityAudit.isIntact ? 'PASSED_TAMPER_PROOF' : 'FAILED_INTEGRITY_VIOLATION',
        violationsDetected: integrityAudit.violations.length
      },
      aggregateSummary: {
        aggregateId,
        sku: currentItem?.sku || events[0].payload?.sku || 'N/A',
        name: currentItem?.name || events[0].payload?.name || 'N/A',
        currentStock: currentItem?.quantity ?? (totalStockAdded - totalStockRemoved),
        currentVersion: events[events.length - 1].version,
        totalEventsRecorded: events.length,
        totalStockAdded,
        totalStockRemoved
      },
      actorActivitySummary: Object.entries(actorActivity).map(([actor, count]) => ({
        actor,
        operationsExecuted: count
      })),
      cryptographicChain: {
        genesisHash: integrityAudit.genesisHash,
        tipHash: integrityAudit.tipHash,
        violations: integrityAudit.violations
      },
      securityAlertsCount: alerts.length,
      securityAlerts: alerts.map(a => ({
        alertId: a.alertId,
        severity: a.severity,
        ruleCode: a.ruleCode,
        message: a.message,
        detectedAt: a.detectedAt
      })),
      movementLedger
    };
  }

  /**
   * Converts the compiled movement ledger to RFC-4180 CSV format for export.
   * 
   * @param {Object} report
   * @returns {String} CSV formatted string
   */
  static exportReportToCSV(report) {
    const headers = ['Version', 'Event Type', 'Actor', 'Quantity Change', 'Timestamp', 'Previous Hash', 'Hash'];
    const rows = report.movementLedger.map(m => [
      m.version,
      `"${m.eventType}"`,
      `"${m.actor}"`,
      m.quantityChange,
      `"${new Date(m.timestamp).toISOString()}"`,
      `"${m.previousHash}"`,
      `"${m.hash}"`
    ]);

    const csvLines = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ];

    return csvLines.join('\n');
  }
}

export default ComplianceReportService;
