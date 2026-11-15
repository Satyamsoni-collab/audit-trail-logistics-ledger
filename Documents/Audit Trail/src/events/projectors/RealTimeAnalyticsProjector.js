import EventBus from '../EventBus.js';
import AnalyticsDashboardView from '../../models/readModels/AnalyticsDashboardView.js';
import cacheService from '../../config/redis.js';
import logger from '../../utils/logger.js';

/**
 * RealTimeAnalyticsProjector
 * 
 * Reactive projector that listens to domain events and updates the
 * real-time AnalyticsDashboardView materialized read model without locking
 * or degrading the performance of the operational inventory read models.
 */
class RealTimeAnalyticsProjector {
  constructor() {
    EventBus.subscribe('ITEM_CREATED', this.onItemCreated.bind(this));
    EventBus.subscribe('STOCK_ADDED', this.onStockMovement.bind(this));
    EventBus.subscribe('STOCK_REMOVED', this.onStockMovement.bind(this));

    logger.info('📊 [Projector] RealTimeAnalyticsProjector subscribed to event bus.');
  }

  async onItemCreated(event) {
    try {
      const initialQty = Number(event.payload.quantity) || 0;
      await AnalyticsDashboardView.findOneAndUpdate(
        { metricKey: 'global_inventory_metrics' },
        {
          $inc: {
            totalItemsTracked: 1,
            totalUnitsInStock: initialQty,
            outOfStockItemsCount: initialQty === 0 ? 1 : 0
          },
          $set: { lastActivityTimestamp: event.timestamp || new Date() }
        },
        { upsert: true, new: true }
      );
      await cacheService.del('cache:readmodel:analytics:realtime');
      logger.info(`[AnalyticsProjector] Metrics updated for new item: ${event.aggregateId}`);
    } catch (err) {
      logger.error(`[AnalyticsProjector Error] Failed to update metrics on ITEM_CREATED: ${err.message}`);
    }
  }

  async onStockMovement(event) {
    try {
      const delta = Number(event.payload.quantityChange) || 0;
      await AnalyticsDashboardView.findOneAndUpdate(
        { metricKey: 'global_inventory_metrics' },
        {
          $inc: {
            totalUnitsInStock: delta,
            totalMovementsCount: 1
          },
          $set: { lastActivityTimestamp: event.timestamp || new Date() }
        },
        { upsert: true, new: true }
      );
      await cacheService.del('cache:readmodel:analytics:realtime');
      logger.info(`[AnalyticsProjector] Real-time metrics updated for stock movement: delta ${delta}`);
    } catch (err) {
      logger.error(`[AnalyticsProjector Error] Failed to update metrics on stock movement: ${err.message}`);
    }
  }
}

export default new RealTimeAnalyticsProjector();
