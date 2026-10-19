import GetInventoryStockHandler from '../../../queries/GetInventoryStockHandler.js';
import GetAuditTrailHistoryHandler from '../../../queries/GetAuditTrailHistoryHandler.js';

export const getInventoryStock = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const result = await GetInventoryStockHandler.handle({ aggregateId: id });
    
    if (!result) {
      return res.status(404).json({ error: 'Inventory item not found' });
    }

    res.status(200).json({
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const getAuditTrail = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const events = await GetAuditTrailHistoryHandler.handle({ aggregateId: id });
    
    res.status(200).json({
      aggregateId: id,
      totalEvents: events.length,
      events
    });
  } catch (error) {
    next(error);
  }
};
