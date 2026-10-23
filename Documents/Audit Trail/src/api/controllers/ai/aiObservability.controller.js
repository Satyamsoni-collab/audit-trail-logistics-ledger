import AILogAnalyticsService from '../../../services/ai/AILogAnalyticsService.js';
import AutonomousRemediationAgent from '../../../services/ai/AutonomousRemediationAgent.js';
import telemetryService from '../../../utils/telemetry.js';

export const getSystemDiagnostics = async (req, res, next) => {
  try {
    const report = await AILogAnalyticsService.performSystemDiagnostics();
    res.status(200).json({ status: 'success', data: report });
  } catch (error) {
    next(error);
  }
};

export const getAggregateHealth = async (req, res, next) => {
  try {
    const { aggregateId } = req.params;
    const health = await AILogAnalyticsService.analyzeAggregateHealth(aggregateId);
    res.status(200).json({ status: 'success', data: health });
  } catch (error) {
    next(error);
  }
};

export const triggerSelfHealing = async (req, res, next) => {
  try {
    const { aggregateId } = req.params;
    const result = await AutonomousRemediationAgent.healAggregateState(aggregateId);
    res.status(200).json({ status: 'success', data: result });
  } catch (error) {
    next(error);
  }
};

export const runRemediationCycle = async (req, res, next) => {
  try {
    const result = await AutonomousRemediationAgent.runAutonomousCycle();
    res.status(200).json({ status: 'success', data: result });
  } catch (error) {
    next(error);
  }
};

export const getRemediationHistory = async (req, res, next) => {
  try {
    const limit = Number(req.query.limit) || 20;
    const history = await AutonomousRemediationAgent.getRemediationHistory(limit);
    res.status(200).json({ status: 'success', count: history.length, data: history });
  } catch (error) {
    next(error);
  }
};

export const getPrometheusMetrics = async (req, res, next) => {
  try {
    const metrics = telemetryService.getPrometheusMetrics();
    res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.status(200).send(metrics);
  } catch (error) {
    next(error);
  }
};
