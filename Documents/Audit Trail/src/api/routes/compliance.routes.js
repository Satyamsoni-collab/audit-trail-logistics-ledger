import { Router } from 'express';
import {
  getComplianceReport,
  verifyChainIntegrity,
  getSecurityAlerts,
  getCertifiedRegulatoryReport,
  getExternalAuditorVerification
} from '../controllers/compliance/compliance.controller.js';

const router = Router();

/**
 * @route GET /api/v1/compliance/report/:aggregateId
 * @desc Retrieve a full regulatory compliance audit report (JSON or CSV format via ?format=csv)
 * @access Public / Auditor
 */
router.get('/report/:aggregateId', getComplianceReport);

/**
 * @route GET /api/v1/compliance/certified-report/:aggregateId
 * @desc Retrieve cryptographically signed SOC2, GDPR & ISO 27001 compliance dossier
 * @access Auditor / Compliance Officer
 */
router.get('/certified-report/:aggregateId', getCertifiedRegulatoryReport);

/**
 * @route GET /api/v1/compliance/external-audit/:aggregateId
 * @desc Secure External Auditor Portal: Zero-knowledge verification of chain continuity and signatures without exposing sensitive payloads
 * @access External Auditor / Regulatory Inspector
 */
router.get('/external-audit/:aggregateId', getExternalAuditorVerification);

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
