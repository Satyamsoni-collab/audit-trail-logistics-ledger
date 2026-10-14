import { Router } from 'express';
import {
  getComplianceReport,
  verifyChainIntegrity,
  getSecurityAlerts
} from '../controllers/compliance/compliance.controller.js';

const router = Router();

/**
 * @route GET /api/v1/compliance/report/:aggregateId
 * @desc Retrieve a full regulatory compliance audit report (JSON or CSV format via ?format=csv)
 * @access Public / Auditor
 */
router.get('/report/:aggregateId', getComplianceReport);

/**
 * @route GET /api/v1/compliance/verify-chain/:aggregateId
 * @desc Cryptographically verify the event hash chain from genesis to tip
 * @access Public / Auditor
 */
router.get('/verify-chain/:aggregateId', verifyChainIntegrity);

/**
 * @route GET /api/v1/compliance/alerts
 * @desc Retrieve real-time detected security anomalies and policy alerts
 * @access Public / Security Admin
 */
router.get('/alerts', getSecurityAlerts);

export default router;
