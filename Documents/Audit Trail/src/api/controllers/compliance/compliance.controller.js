import ComplianceReportService from '../../../services/compliance/ComplianceReportService.js';
import EventStoreService from '../../../services/EventStoreService.js';
import SecurityAlert from '../../../models/alerts/SecurityAlert.js';

/**
 * Controller for Compliance, Audit Reporting, and Cryptographic Verification.
 */
export const getComplianceReport = async (req, res, next) => {
  try {
    const { aggregateId } = req.params;
    const { format } = req.query;

    const report = await ComplianceReportService.generateAuditReport(aggregateId);

    if (!report) {
      return res.status(404).json({
        status: 'error',
        code: 'NOT_FOUND',
        message: `No event history found for aggregate ID: ${aggregateId}`
      });
    }

    if (format && format.toLowerCase() === 'csv') {
      const csv = ComplianceReportService.exportReportToCSV(report);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="audit-report-${aggregateId}.csv"`);
      return res.status(200).send(csv);
    }

    res.status(200).json({
      status: 'success',
      data: report
    });
  } catch (error) {
    next(error);
  }
};

export const verifyChainIntegrity = async (req, res, next) => {
  try {
    const { aggregateId } = req.params;
    const audit = await EventStoreService.verifyChainIntegrity(aggregateId);

    res.status(200).json({
      status: 'success',
      data: audit
    });
  } catch (error) {
    next(error);
  }
};

export const getSecurityAlerts = async (req, res, next) => {
  try {
    const { aggregateId, status, severity } = req.query;
    const query = {};

    if (aggregateId) query.aggregateId = aggregateId;
    if (status) query.status = status.toUpperCase();
    if (severity) query.severity = severity.toUpperCase();

    const alerts = await SecurityAlert.find(query).sort({ detectedAt: -1 }).limit(100).lean().exec();

    res.status(200).json({
      status: 'success',
      count: alerts.length,
      data: alerts
    });
  } catch (error) {
    next(error);
  }
};
