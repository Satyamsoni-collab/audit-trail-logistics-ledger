import EventStoreService from '../../services/EventStoreService.js';

class GetAuditTrailHistoryHandler {
  static async handle(queryData) {
    if (!queryData.aggregateId) {
      throw new Error('ValidationException: aggregateId is required.');
    }

    // Fetch the raw events directly from the Event Store
    const events = await EventStoreService.getEventStream(queryData.aggregateId);
    
    return events;
  }
}

export default GetAuditTrailHistoryHandler;
