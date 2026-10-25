import { Router } from 'express';
import { createItem, updateStock } from '../controllers/commands/inventory.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/rbac.middleware.js';

const router = Router();

/**
 * @route POST /api/commands/inventory
 * @desc Receive a command to create a new inventory item.
 * @access Protected (Requires 'inventory:create' permission)
 */
router.post('/inventory', requireAuth, authorize({ permission: 'inventory:create' }), createItem);

/**
 * @route POST /api/commands/inventory/:id/stock
 * @desc Receive a command to update the stock (add/remove) of an inventory item.
 * @access Protected (Requires 'stock:update' permission)
 */
router.post('/inventory/:id/stock', requireAuth, authorize({ permission: 'stock:update' }), updateStock);

export default router;
