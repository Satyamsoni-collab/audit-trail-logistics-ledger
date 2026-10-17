
import Event from '../models/events/EventStore.js';
import EventBus from '../events/EventBus.js';

/**
 * Service to interact with the Event Store.
 */
class EventStoreService {

  /**
   * Validates event data before saving it.
   */
  static validateEventData({
    aggregateId,
    aggregateType,
    eventType,
    payload,
    expectedVersion,
    actor
  }) {
    if (
      typeof aggregateId !== 'string' ||
      !aggregateId.trim()
    ) {
      throw new Error(
        'ValidationError: aggregateId must be a non-empty string.'
      );
    }

    if (
      typeof aggregateType !== 'string' ||
      !['InventoryItem', 'Shipment'].includes(aggregateType)
    ) {
      throw new Error(
        'ValidationError: Invalid aggregateType.'
      );
    }

    if (
      typeof eventType !== 'string' ||
      !eventType.trim()
    ) {
      throw new Error(
        'ValidationError: eventType must be a non-empty string.'
      );
    }

    if (
      !payload ||
      typeof payload !== 'object' ||
      Array.isArray(payload)
    ) {
      throw new Error(
        'ValidationError: payload must be a valid object.'
      );
    }

    if (
      !Number.isSafeInteger(expectedVersion) ||
      expectedVersion < 0 ||
      !Number.isSafeInteger(expectedVersion + 1)
    ) {
      throw new Error(
        'ValidationError: expectedVersion must be a non-negative safe integer.'
      );
    }

    if (
      typeof actor !== 'string' ||
      !actor.trim()
    ) {
      throw new Error(
        'ValidationError: actor must be a non-empty string.'
      );
    }
  }

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
    // Validate inputs before writing to MongoDB
    this.validateEventData({
      aggregateId,
      aggregateType,
      eventType,
      payload,
      expectedVersion,
      actor
    });

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

      console.log(
        `[EventStore] Appended ${eventType} to ${aggregateType} ${aggregateId} at version ${newVersion}`
      );

      // Publish event so projectors can update read models
      EventBus.publish(eventType, savedEvent);

      return savedEvent;
    } catch (error) {
      if (error.code === 11000) {
        throw new Error(
          `ConcurrencyException: Aggregate ${aggregateId} has been modified by another process.`
        );
      }

      throw error;
    }
  }

  /**
   * Retrieves the full event stream for a given aggregate.
   * Used for Event Replay to rebuild state in memory.
   *
   * @param {String} aggregateId
   * @returns {Promise<Array>} Events sorted by version
   */
  static async getEventStream(aggregateId) {
    if (
      typeof aggregateId !== 'string' ||
      !aggregateId.trim()
    ) {
      throw new Error(
        'ValidationError: aggregateId must be a non-empty string.'
      );
    }

    return Event.find({ aggregateId })
      .sort({ version: 1 })
      .exec();
  }
}

export default EventStoreService;
