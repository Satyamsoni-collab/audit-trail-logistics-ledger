import CreateItemHandler from '../../../commands/CreateItemHandler.js';
import UpdateStockHandler from '../../../commands/UpdateStockHandler.js';

export const createItem = async (req, res, next) => {
  try {
    const commandData = req.body;
    // In a real app, actor might come from req.user
    commandData.actor = req.headers['x-user-id'] || 'anonymous-user';
    
    const result = await CreateItemHandler.handle(commandData);
    
    // HTTP 202 Accepted is standard for asynchronous CQRS writes
    res.status(202).json(result);
  } catch (error) {
    next(error);
  }
};

export const updateStock = async (req, res, next) => {
  try {
    const { id } = req.params;
    const commandData = { ...req.body, aggregateId: id };
    commandData.actor = req.headers['x-user-id'] || 'anonymous-user';
    
    const result = await UpdateStockHandler.handle(commandData);
    
    res.status(202).json(result);
  } catch (error) {
    next(error);
  }
};
