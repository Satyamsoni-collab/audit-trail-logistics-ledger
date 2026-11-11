import Event from '../models/events/EventStore.js';
import EventBus from '../events/EventBus.js';
import crypto from 'crypto';

class EventStoreService {
  static computeEventHash({
    previousHash,
    aggregateId,
    version,
    eventType,
    payload,
    timestamp
  }) {
    const canonicalData = JSON.stringify({
      previousHash,
      aggregateId,
      version,
      eventType,
      payload,
      timestamp: new Date(timestamp).toISOString()
    });

    return crypto
      .createHash('sha256')
      .update(canonicalData)
      .digest('hex');
  }

  static isVersionConflict(error) {
    return (
      error?.code === 11000 &&
      (
        error?.keyPattern?.version === 1 ||
        error?.keyPattern?.aggregateId === 1 ||
        (
          error?.keyPattern?.aggregateId === 1 &&
          error?.keyPattern?.version === 1
        )
      )
    );
  }

  static async appendEvent({
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
      !aggregateType.trim()
    ) {
      throw new Error(
        'ValidationError: aggregateType must be a non-empty string.'
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
      !Number.isSafeInteger(expectedVersion) ||
      expectedVersion < 0
    ) {
      throw new Error(
        'ValidationError: expectedVersion must be a non-negative integer.'
      );
    }

    if (
      !payload ||
      typeof payload !== 'object' ||
      Array.isArray(payload)
    ) {
      throw new Error(
        'ValidationError: payload must be an object.'
      );
    }

    const currentVersion = await Event.countDocuments({
      aggregateId
    });

    if (currentVersion !== expectedVersion) {
      throw new Error(
        `ConcurrencyException: Aggregate ${aggregateId} ` +
        `expected version ${expectedVersion}, current version is ${currentVersion}.`
      );
    }

    const newVersion = expectedVersion + 1;

    try {
      const prevEvent = await Event.findOne({ aggregateId })
        .sort({ version: -1 })
        .exec();

      const timestamp = new Date();

      const previousHash = prevEvent
        ? prevEvent.hash || 'GENESIS'
        : 'GENESIS';

      const hash = this.computeEventHash({
        previousHash,
        aggregateId,
        version: newVersion,
        eventType,
        payload,
        timestamp
      });

      const event = new Event({
        aggregateId,
        aggregateType,
        eventType,
        payload,
        version: newVersion,
        actor,
        timestamp,
        previousHash,
        hash
      });

      const savedEvent = await event.save();

      console.log(
        `[EventStore] Appended ${eventType} to ${aggregateType} ` +
        `${aggregateId} [v${newVersion}] ` +
        `[hash: ${hash.substring(0, 10)}...]`
      );

      // Wait for event publishing and allow failures to propagate.
      await EventBus.publish(eventType, savedEvent);

      return savedEvent;
    } catch (error) {
      if (this.isVersionConflict(error)) {
        throw new Error(
          `ConcurrencyException: Aggregate ${aggregateId} ` +
          `version ${newVersion} already exists. ` +
          'Reload the event stream and retry.'
        );
      }

      throw error;
    }
  }

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

  static async verifyChainIntegrity(aggregateId) {
    const events = await this.getEventStream(aggregateId);

    let previousHash = 'GENESIS';
    let expectedVersion = 1;

    for (const event of events) {
      if (event.version !== expectedVersion) {
        return {
          valid: false,
          aggregateId,
          failedVersion: event.version,
          reason: `Expected version ${expectedVersion}, received ${event.version}.`
        };
      }

      if (event.previousHash !== previousHash) {
        return {
          valid: false,
          aggregateId,
          failedVersion: event.version,
          reason: 'Previous hash does not match the preceding event.'
        };
      }

      const computedHash = this.computeEventHash({
        previousHash: event.previousHash,
        aggregateId: event.aggregateId,
        version: event.version,
        eventType: event.eventType,
        payload: event.payload,
        timestamp: event.timestamp
      });

      if (computedHash !== event.hash) {
        return {
          valid: false,
          aggregateId,
          failedVersion: event.version,
          reason: 'Event hash does not match the computed hash.'
        };
      }

      previousHash = event.hash;
      expectedVersion++;
    }

    return {
      valid: true,
      aggregateId,
      eventCount: events.length,
      lastVersion: expectedVersion - 1
    };
  }
}

export default EventStoreService;