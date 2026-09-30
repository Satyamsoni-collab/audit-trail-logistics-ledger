import InventoryItemReadModel from '../../models/readModels/InventoryItem.js';

class GetInventoryStockHandler {
  static async handle(queryData) {
    if (!queryData.aggregateId) {
      throw new Error('ValidationException: aggregateId is required.');
    }

    const item = await InventoryItemReadModel.findOne({ aggregateId: queryData.aggregateId });
    
    if (!item) {
      return null;
    }

    return item;
  }
}

export default GetInventoryStockHandler;
