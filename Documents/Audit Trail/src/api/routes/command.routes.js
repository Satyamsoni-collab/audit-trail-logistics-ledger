import { Router } from 'express';
import { createItem, updateStock } from '../controllers/commands/inventory.controller.js';

const router = Router();

/**
 * @route POST /api/commands/inventory
 * @desc Receive a command to create a new inventory item.
 * @access Public (for now)
 */
router.post('/inventory', createItem);

/**
 * @route PUT /api/commands/inventory/:id/stock
 * @desc Receive a command to update the stock (add/remove) of an inventory item.
 * @access Public (for now)
 */
router.put('/inventory/:id/stock', updateStock);

export default router;
