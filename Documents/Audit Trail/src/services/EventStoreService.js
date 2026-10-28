import crypto from 'crypto';
import Event from '../models/events/EventStore.js';
import EventBus from '../events/EventBus.js';

class EventStoreService {
  static computeEventHash({
    previousHash,
    aggregateId,
    version,
    eventType,
    payload,
    timestamp
  }) {
    const raw = `${previousHash}|${aggregateId}|${version}|${eventType}|${JSON.stringify(payload)}|${new Date(timestamp).toISOString()}`;
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

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
        `[EventStore] Appended ${eventType} to ${aggregateType} ${aggregateId} [v${newVersion}] [hash: ${hash.substring(0, 10)}...]`
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

  static async verifyChainIntegrity(aggregateId) {
    const events = await Event.find({ aggregateId })
      .sort({ version: 1 })
      .exec();

    if (!events || events.length === 0) {
      return {
        aggregateId,
        isIntact: true,
        totalEvents: 0,
        message: 'No events found for aggregate.'
      };
    }

    let expectedPrevHash = 'GENESIS';
    const violations = [];

    for (const ev of events) {
      if (ev.previousHash && ev.previousHash !== expectedPrevHash) {
        violations.push({
          version: ev.version,
          reason: `Broken hash chain link: Expected previousHash ${expectedPrevHash}, found ${ev.previousHash}`
        });
      }

      const computedHash = this.computeEventHash({
        previousHash: ev.previousHash || expectedPrevHash,
        aggregateId: ev.aggregateId,
        version: ev.version,
        eventType: ev.eventType,
        payload: ev.payload,
        timestamp: ev.timestamp
      });

      if (ev.hash && ev.hash !== computedHash) {
        violations.push({
          version: ev.version,
          reason: `Cryptographic hash mismatch (tampering detected): Expected ${computedHash}, found ${ev.hash}`
        });
      }

      expectedPrevHash = ev.hash || computedHash;
    }

    return {
      aggregateId,
      isIntact: violations.length === 0,
      totalEvents: events.length,
      genesisHash: events[0].hash || 'N/A',
      tipHash: expectedPrevHash,
      violations
    };
  }
}

export default EventStoreService;