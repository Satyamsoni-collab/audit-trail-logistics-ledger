import { Router } from 'express';
import { createItem, updateStock } from '../controllers/commands/inventory.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';

const router = Router();

/**
 * @route POST /api/commands/inventory
 * @desc Receive a command to create a new inventory item.
 * @access Protected
 */
router.post('/inventory', requireAuth, createItem);

/**
 * @route POST /api/commands/inventory/:id/stock
 * @desc Receive a command to update the stock (add/remove) of an inventory item.
 * @access Protected
 */
router.post('/inventory/:id/stock', requireAuth, updateStock);

export default router;
