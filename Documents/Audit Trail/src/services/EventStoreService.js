import Event from '../models/events/EventStore.js';
import EventBus from '../events/EventBus.js';

class EventStoreService {
  static validateEventData({
    aggregateId,
    aggregateType,
    eventType,
    payload,
    expectedVersion,
    actor
  }) {
    if (typeof aggregateId !== 'string' || !aggregateId.trim()) {
      throw new Error(
        'ValidationError: aggregateId must be a non-empty string.'
      );
    }

    if (
      typeof aggregateType !== 'string' ||
      !['InventoryItem', 'Shipment'].includes(aggregateType)
    ) {
      throw new Error('ValidationError: Invalid aggregateType.');
    }

    if (typeof eventType !== 'string' || !eventType.trim()) {
      throw new Error(
        'ValidationError: eventType must be a non-empty string.'
      );
    }

    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
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

    if (typeof actor !== 'string' || !actor.trim()) {
      throw new Error(
        'ValidationError: actor must be a non-empty string.'
      );
    }
  }

  static isVersionConflict(error) {
    if (error?.code !== 11000) {
      return false;
    }

    const keyPattern = error.keyPattern;

    if (
      keyPattern &&
      Object.prototype.hasOwnProperty.call(keyPattern, 'aggregateId') &&
      Object.prototype.hasOwnProperty.call(keyPattern, 'version') &&
      Object.keys(keyPattern).length === 2
    ) {
      return true;
    }

    const message = error.message || '';

    return (
      message.includes('aggregateId_1_version_1') ||
      message.includes('aggregateId: 1, version: 1')
    );
  }

  static async appendEvent({
    aggregateId,
    aggregateType,
    eventType,
    payload,
    expectedVersion,
    actor = 'system'
  }) {
    this.validateEventData({
      aggregateId,
      aggregateType,
      eventType,
      payload,
      expectedVersion,
      actor
    });

    const newVersion = expectedVersion + 1;

    try {
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

      EventBus.publish(eventType, savedEvent);

      return savedEvent;
    } catch (error) {
      if (this.isVersionConflict(error)) {
        throw new Error(
          `ConcurrencyException: Aggregate ${aggregateId} version ${newVersion} already exists. Reload the event stream and retry.`
        );
      }

      throw error;
    }
  }

  static async getEventStream(aggregateId) {
    if (typeof aggregateId !== 'string' || !aggregateId.trim()) {
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