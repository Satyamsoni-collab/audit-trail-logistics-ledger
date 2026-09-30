import { Router } from 'express';
import { getInventoryStock, getAuditTrail } from '../controllers/queries/inventory.query.controller.js';

const router = Router();

/**
 * @route GET /api/queries/inventory/:id
 * @desc Retrieve the current state (projection/read model) of an inventory item.
 * @access Public (for now)
 */
router.get('/inventory/:id', getInventoryStock);

/**
 * @route GET /api/queries/inventory/:id/events
 * @desc Retrieve the raw audit trail / event stream for a specific item.
 * @access Public (for now)
 */
router.get('/inventory/:id/events', getAuditTrail);

export default router;
