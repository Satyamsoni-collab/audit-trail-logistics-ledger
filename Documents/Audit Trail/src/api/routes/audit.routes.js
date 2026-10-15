import { Router } from 'express';
import { getAuditHistory, verifyAggregateState, createSnapshot } from '../controllers/audit/audit.controller.js';

const router = Router();

/**
 * @route GET /api/v1/inventory/:itemId/audit
 * @desc Retrieve the chronological history of events for an item.
 * @access Public
 */
router.get('/inventory/:itemId/audit', getAuditHistory);

/**
 * @route GET /api/v1/inventory/:itemId/verify
 * @desc Replay the aggregate state and compare it with the current read model.
 * @access Public
 */
router.get('/inventory/:itemId/verify', verifyAggregateState);

/**
 * @route POST /api/v1/inventory/:itemId/snapshot
 * @desc Manually trigger a snapshot for an aggregate to optimize future replays.
 * @access Public (In production, this should be admin-only)
 */
router.post('/inventory/:itemId/snapshot', createSnapshot);

export default router;
