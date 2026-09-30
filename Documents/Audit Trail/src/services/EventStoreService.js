import Event from '../models/events/EventStore.js';
import EventBus from '../events/EventBus.js';

/**
 * Service to interact with the Event Store.
 */
class EventStoreService {
  
  /**
   * Appends a new event to the Event Store.
   * Enforces Optimistic Concurrency Control using the version number.
   * 
   * @param {Object} eventData
   * @param {String} eventData.aggregateId
   * @param {String} eventData.aggregateType
   * @param {String} eventData.eventType
   * @param {Object} eventData.payload
   * @param {Number} eventData.expectedVersion
   * @param {String} [eventData.actor]
   * @returns {Promise<Object>} The saved event
   */
  static async appendEvent({
    aggregateId,
    aggregateType,
    eventType,
    payload,
    expectedVersion,
    actor = 'system'
  }) {
    try {
      const newVersion = expectedVersion + 1;

      const event = new Event({
        aggregateId,
        aggregateType,
        eventType,
        payload,
        version: newVersion,
        actor
      });

      const savedEvent = await event.save();
      console.log(`[EventStore] Appended ${eventType} to ${aggregateType} ${aggregateId} at version ${newVersion}`);
      
      // Publish event to the local Event Bus so Projectors can update Read Models
      EventBus.publish(eventType, savedEvent);

      return savedEvent;
    } catch (error) {
      if (error.code === 11000) {
        throw new Error(`ConcurrencyException: Aggregate ${aggregateId} has been modified by another process.`);
      }
      throw error;
    }
  }

  /**
   * Retrieves the full event stream for a given aggregate.
   * Used for "Event Replay" to rebuild state in memory.
   * 
   * @param {String} aggregateId 
   * @returns {Promise<Array>} Array of events sorted by version
   */
  static async getEventStream(aggregateId) {
    return Event.find({ aggregateId }).sort({ version: 1 }).exec();
  }
}

export default EventStoreService;
