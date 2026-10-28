import GetInventoryStockHandler from '../../../queries/GetInventoryStockHandler.js';
import GetAuditTrailHistoryHandler from '../../../queries/GetAuditTrailHistoryHandler.js';
import cacheService from '../../../config/redis.js';
import logger from '../../../utils/logger.js';

/**
 * Retrieves the current materialized read-model state of an inventory or shipment item.
 * Utilizes Redis distributed caching to minimize database query latency.
 */
export const getInventoryStock = async (req, res, next) => {
  try {
    const { id } = req.params;
    const cacheKey = `cache:readmodel:inventory:${id}`;

    // 1. Attempt Redis Cache Retrieval
    const cachedItem = await cacheService.get(cacheKey);
    if (cachedItem) {
      logger.debug(`⚡ [Query] Redis Cache HIT for item: ${id}`);
      return res.status(200).json({
        source: 'cache',
        cachedAt: cachedItem.cachedAt,
        data: cachedItem.data
      });
    }

    // 2. Cache Miss: Execute CQRS Read-Model Query
    const result = await GetInventoryStockHandler.handle({ aggregateId: id });
    
    if (!result) {
      return res.status(404).json({ error: 'Inventory item not found' });
    }

    // 3. Populate Redis Cache (120s TTL)
    await cacheService.set(cacheKey, {
      cachedAt: new Date().toISOString(),
      data: result
    }, 120);

    res.status(200).json({
      source: 'database',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieves the event-sourced audit trail for an aggregate with Redis query acceleration.
 */
export const getAuditTrail = async (req, res, next) => {
  try {
    const { id } = req.params;
    const cacheKey = `cache:audit-trail:${id}`;

    // 1. Attempt Redis Cache Retrieval
    const cachedTrail = await cacheService.get(cacheKey);
    if (cachedTrail) {
      logger.debug(`⚡ [Query] Redis Cache HIT for audit trail: ${id}`);
      return res.status(200).json({
        source: 'cache',
        cachedAt: cachedTrail.cachedAt,
        aggregateId: id,
        totalEvents: cachedTrail.totalEvents,
        events: cachedTrail.events
      });
    }

    // 2. Cache Miss: Fetch from Event Store
    const events = await GetAuditTrailHistoryHandler.handle({ aggregateId: id });
    
    // 3. Cache in Redis (30s TTL to balance real-time freshness and throughput)
    await cacheService.set(cacheKey, {
      cachedAt: new Date().toISOString(),
      totalEvents: events.length,
      events
    }, 30);

    res.status(200).json({
      source: 'database',
      aggregateId: id,
      totalEvents: events.length,
      events
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieves real-time materialized analytics metrics with Redis distributed caching.
 */
export const getRealtimeAnalytics = async (req, res, next) => {
  try {
    const cacheKey = 'cache:readmodel:analytics:realtime';

    // 1. Attempt Redis Cache Retrieval
    const cachedAnalytics = await cacheService.get(cacheKey);
    if (cachedAnalytics) {
      logger.debug('⚡ [Query] Redis Cache HIT for realtime analytics view');
      return res.status(200).json({
        status: 'success',
        source: 'cache',
        cachedAt: cachedAnalytics.cachedAt,
        data: cachedAnalytics.data
      });
    }

    // 2. Cache Miss: Query Materialized View from MongoDB
    const AnalyticsDashboardView = (await import('../../../models/readModels/AnalyticsDashboardView.js')).default;
    const metrics = await AnalyticsDashboardView.findOne({ metricKey: 'global_inventory_metrics' }).lean();

    const fallbackMetrics = {
      metricKey: 'global_inventory_metrics',
      totalItemsTracked: 0,
      totalUnitsInStock: 0,
      totalMovementsCount: 0,
      outOfStockItemsCount: 0,
      lastActivityTimestamp: new Date()
    };

    const resolvedData = metrics || fallbackMetrics;

    // 3. Store in Redis (60s TTL)
    await cacheService.set(cacheKey, {
      cachedAt: new Date().toISOString(),
      data: resolvedData
    }, 60);

    res.status(200).json({
      status: 'success',
      source: 'database',
      data: resolvedData
    });
  } catch (error) {
    next(error);
  }
};
