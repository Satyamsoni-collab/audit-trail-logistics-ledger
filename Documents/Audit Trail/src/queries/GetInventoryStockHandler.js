import InventoryItemReadModel from '../models/readModels/InventoryItem.js';
import cacheService from '../config/redis.js';

class GetInventoryStockHandler {
  static async handle(queryData) {
    if (!queryData.aggregateId) {
      throw new Error('ValidationException: aggregateId is required.');
    }

    const cacheKey = `cache:inventory:${queryData.aggregateId}`;

    // 1. Check Redis Cache
    const cachedItem = await cacheService.get(cacheKey);
    if (cachedItem) {
      return {
        ...cachedItem,
        _cached: true
      };
    }

    // 2. Cache Miss: Fetch from MongoDB Read Model (Materialized View)
    const item = await InventoryItemReadModel.findOne({ aggregateId: queryData.aggregateId }).lean();
    
    if (!item) {
      return null;
    }

    // 3. Populate Cache (TTL 5 minutes)
    await cacheService.set(cacheKey, item, 300);

    return {
      ...item,
      _cached: false
    };
  }
}

export default GetInventoryStockHandler;
