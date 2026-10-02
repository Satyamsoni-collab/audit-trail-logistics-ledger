import Event from '../models/events/EventStore.js';

class AuditTrailService {
  /**
   * Retrieves the chronological history of events for a specific item,
   * sorted by timestamp.
   * @param {String} aggregateId
   * @returns {Promise<Array>}
   */
  static async getAuditHistory(aggregateId) {
    // Query Event Store directly and sort by timestamp
    return Event.find({ aggregateId }).sort({ timestamp: 1 }).exec();
  }

  /**
   * Replays events from the event store to reconstruct the aggregate state.
   * This is useful for state verification and debugging, acting as the Source of Truth.
   * @param {String} aggregateId 
   * @returns {Promise<Object>} The reconstructed state
   */
  static async replayState(aggregateId) {
    // Fetch all events for the aggregate, ordered by version
    const events = await Event.find({ aggregateId }).sort({ version: 1 }).exec();
    
    if (!events || events.length === 0) {
      return null; // Aggregate doesn't exist or has no events
    }

    // Initialize the base state
    const state = {
      aggregateId,
      quantity: 0,
      version: 0,
      history: []
    };

    // Replay logic applying each event iteratively
    for (const event of events) {
      switch (event.eventType) {
        case 'ITEM_CREATED':
          state.sku = event.payload.sku;
          state.name = event.payload.name;
          state.location = event.payload.location;
          state.quantity = event.payload.quantity || 0;
          break;
        case 'STOCK_ADDED':
          state.quantity += event.payload.quantityChange;
          break;
        case 'STOCK_REMOVED':
          state.quantity += event.payload.quantityChange; // quantityChange is expected to be negative
          break;
        default:
          console.warn(`[Replay] Unknown event type: ${event.eventType}`);
      }
      state.version = event.version;
      state.history.push({ 
        eventType: event.eventType, 
        timestamp: event.timestamp,
        version: event.version 
      });
    }

    state.status = state.quantity <= 0 ? 'OUT_OF_STOCK' : 'AVAILABLE';
    return state;
  }
}

export default AuditTrailService;
