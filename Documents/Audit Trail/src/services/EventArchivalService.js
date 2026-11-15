
import crypto from 'crypto';
import Event from '../models/events/EventStore.js';
import EventArchive from '../models/events/EventArchive.js';
import Snapshot from '../models/events/Snapshot.js';
import logger from '../utils/logger.js';

class EventArchivalService {
  /**
   * Generates a cryptographic SHA-256 checksum.
   */
  static computeChecksum(event) {
    const rawContent =
      `${event.aggregateId}:${event.version}:${event.eventType}:` +
      `${JSON.stringify(event.payload)}:${event.timestamp.toISOString()}`;

    return crypto.createHash('sha256').update(rawContent).digest('hex');
  }

  /**
   * Copies eligible historical events to cold storage.
   * Original Event Store records are never deleted.
   * Existing archive entries are not inserted again.
   */
  static async archiveHistoricalEvents({
    olderThanDays = 30,
    dryRun = false
  } = {}) {
    if (!Number.isFinite(olderThanDays) || olderThanDays < 0) {
      throw new Error('olderThanDays must be a non-negative number.');
    }

    const cutoffDate = new Date(
      Date.now() - olderThanDays * 24 * 60 * 60 * 1000
    );

    const batchId =
      `ARCHIVE-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

    logger.info(
      `[EventArchivalService] Starting batch ${batchId} ` +
      `(Cutoff: ${cutoffDate.toISOString()}, dryRun: ${dryRun})`
    );

    const snapshots = await Snapshot.find().exec();

    let totalEligible = 0;
    let totalArchived = 0;

    for (const snapshot of snapshots) {
      const query = {
        aggregateId: snapshot.aggregateId,
        version: { $lt: snapshot.version },
        timestamp: { $lte: cutoffDate }
      };

      const eligibleEvents = await Event.find(query)
        .sort({ version: 1 })
        .exec();

      if (!eligibleEvents.length) continue;

      totalEligible += eligibleEvents.length;

      if (dryRun) {
        logger.info(
          `[EventArchivalService] DRY-RUN: ` +
          `${eligibleEvents.length} events eligible for ${snapshot.aggregateId}`
        );
        continue;
      }

      const archiveDocs = eligibleEvents.map(event => ({
        originalEventId: event._id,
        aggregateId: event.aggregateId,
        aggregateType: event.aggregateType,
        eventType: event.eventType,
        payload: event.payload,
        version: event.version,
        actor: event.actor,
        originalTimestamp: event.timestamp,
        archiveBatchId: batchId,
        checksum: this.computeChecksum(event)
      }));

      // Upsert makes archiving repeat-safe using the unique aggregate/version key.
      const archiveOperations = archiveDocs.map(doc => ({
        updateOne: {
          filter: {
            aggregateId: doc.aggregateId,
            version: doc.version
          },
          update: {
            $setOnInsert: doc
          },
          upsert: true
        }
      }));

      const result = await EventArchive.bulkWrite(
        archiveOperations,
        { ordered: false }
      );

      const newlyArchived = result.upsertedCount || 0;
      totalArchived += newlyArchived;

      logger.info(
        `[EventArchivalService] Added ${newlyArchived} new archive copies ` +
        `for aggregate ${snapshot.aggregateId}. Original events retained.`
      );
    }

    logger.info(
      `[EventArchivalService] Batch complete. ` +
      `Eligible: ${totalEligible}, New archive copies: ${totalArchived}`
    );

    return {
      batchId,
      totalEligible,
      totalArchived,
      dryRun
    };
  }

  /**
   * Retrieves a complete audit trail without duplicate versions.
   * Original Event Store records take priority over archive copies.
   */
  static async getFullAuditTrailWithArchive(aggregateId) {
    const [coldEvents, hotEvents] = await Promise.all([
      EventArchive.find({ aggregateId }).sort({ version: 1 }).exec(),
      Event.find({ aggregateId }).sort({ version: 1 }).exec()
    ]);

    const eventsByVersion = new Map();

    for (const event of coldEvents) {
      eventsByVersion.set(event.version, event);
    }

    for (const event of hotEvents) {
      eventsByVersion.set(event.version, event);
    }

    const stream = [...eventsByVersion.values()].sort(
      (a, b) => a.version - b.version
    );

    return {
      aggregateId,
      coldEventCount: coldEvents.length,
      hotEventCount: hotEvents.length,
      totalEvents: stream.length,
      stream
    };
  }
}

export default EventArchivalService;
