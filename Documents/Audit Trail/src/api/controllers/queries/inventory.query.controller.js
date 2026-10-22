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

export const getRealtimeAnalytics = async (req, res, next) => {
  try {
    const AnalyticsDashboardView = (await import('../../../models/readModels/AnalyticsDashboardView.js')).default;
    const metrics = await AnalyticsDashboardView.findOne({ metricKey: 'global_inventory_metrics' });

    res.status(200).json({
      status: 'success',
      data: metrics || {
        metricKey: 'global_inventory_metrics',
        totalItemsTracked: 0,
        totalUnitsInStock: 0,
        totalMovementsCount: 0,
        outOfStockItemsCount: 0,
        lastActivityTimestamp: new Date()
      }
    });
  } catch (error) {
    next(error);
  }
};
