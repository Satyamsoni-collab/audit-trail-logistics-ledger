import { Router } from 'express';
import {
  getSystemDiagnostics,
  getAggregateHealth,
  triggerSelfHealing,
  runRemediationCycle,
  getRemediationHistory,
  getPrometheusMetrics
} from '../controllers/ai/aiObservability.controller.js';

const router = Router();

/**
 * @route GET /api/v1/ai/diagnostics
 * @desc Full system AI diagnostic scan with statistical anomaly detection and remediation plans
 */
router.get('/diagnostics', getSystemDiagnostics);

/**
 * @route GET /api/v1/ai/diagnostics/:aggregateId
 * @desc Granular parity evaluation between Event Store and Read Model for a specific aggregate
 */
router.get('/diagnostics/:aggregateId', getAggregateHealth);

/**
 * @route POST /api/v1/ai/self-heal/:aggregateId
 * @desc Autonomously triggers event replay and projection repair for a desynchronized item
 */
router.post('/self-heal/:aggregateId', triggerSelfHealing);

/**
 * @route POST /api/v1/ai/remediation-cycle
 * @desc Executes an end-to-end autonomous healing cycle
 */
router.post('/remediation-cycle', runRemediationCycle);

/**
 * @route GET /api/v1/ai/remediation-history
 * @desc Retrieves historical audit log of autonomous self-healing actions taken
 */
router.get('/remediation-history', getRemediationHistory);

/**
 * @route GET /api/v1/ai/metrics
 * @desc Exposes telemetry metrics in Prometheus exposition format
 */
router.get('/metrics', getPrometheusMetrics);

export default router;
