import { Router } from 'express';
import { createItem, updateStock } from '../controllers/commands/inventory.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { authorize, requireRole } from '../middlewares/rbac.middleware.js';

const router = Router();

/**
 * @route POST /api/commands/inventory
 * @desc Receive a command to create a new inventory item or shipment aggregate.
 * @access Protected (Restricted to Administrative & Logistics Managers)
 */
router.post(
  '/inventory',
  requireAuth,
  requireRole(['CISO_ADMIN', 'LOGISTICS_MANAGER', 'SYSTEM_AUTOMATION']),
  authorize({ permission: 'inventory:create', requiredClearance: 'HIGH' }),
  createItem
);

/**
 * @route POST /api/commands/inventory/:id/stock
 * @desc Receive a state-changing command to update stock or dispatch shipment movements.
 * @access Protected (Restricted to Authorized Operational & Management Roles)
 */
router.post(
  '/inventory/:id/stock',
  requireAuth,
  requireRole(['CISO_ADMIN', 'LOGISTICS_MANAGER', 'WAREHOUSE_OPERATOR', 'SYSTEM_AUTOMATION']),
  authorize({ permission: 'stock:update' }),
  updateStock
);

export default router;
