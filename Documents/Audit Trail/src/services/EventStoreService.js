import crypto from 'crypto';
import Event from '../models/events/EventStore.js';
import EventBus from '../events/EventBus.js';

/**
 * Service to interact with the Event Store.
 * Implements Cryptographic Event Chaining for absolute tamper-evidence.
 */
class EventStoreService {

  /**
   * Computes a deterministic SHA-256 hash for an event chained to its predecessor.
   */
  static computeEventHash({ previousHash, aggregateId, version, eventType, payload, timestamp }) {
    const raw = `${previousHash}|${aggregateId}|${version}|${eventType}|${JSON.stringify(payload)}|${new Date(timestamp).toISOString()}`;
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

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
   * Enforces Optimistic Concurrency Control and Cryptographic Hashing.
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
      const timestamp = new Date();

      // Retrieve previous event in chain to get previousHash
      const prevEvent = await Event.findOne({ aggregateId }).sort({ version: -1 }).exec();
      const previousHash = prevEvent ? (prevEvent.hash || 'GENESIS') : 'GENESIS';

      // Compute cryptographic hash for this event
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
      console.log(`[EventStore] Appended ${eventType} to ${aggregateType} ${aggregateId} [v${newVersion}] [hash: ${hash.substring(0, 10)}...]`);
      
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

  /**
   * Verifies cryptographic chain integrity from genesis to current tip.
   * Ensures zero tampering or missing blocks across the event stream.
   * 
   * @param {String} aggregateId 
   * @returns {Promise<Object>} Verification audit result
   */
  static async verifyChainIntegrity(aggregateId) {
    const events = await Event.find({ aggregateId }).sort({ version: 1 }).exec();
    
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
      // 1. Check parent linkage
      if (ev.previousHash && ev.previousHash !== expectedPrevHash) {
        violations.push({
          version: ev.version,
          reason: `Broken hash chain link: Expected previousHash ${expectedPrevHash}, found ${ev.previousHash}`
        });
      }

      // 2. Recompute and check payload hash
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
