import crypto from 'crypto';
import Event from '../models/events/EventStore.js';
import EventArchive from '../models/events/EventArchive.js';
import Snapshot from '../models/events/Snapshot.js';
import logger from '../utils/logger.js';

class EventArchivalService {
  /**
   * Generates a cryptographic SHA-256 checksum for an event's immutable contents.
   */
  static computeChecksum(event) {
    const rawContent = `${event.aggregateId}:${event.version}:${event.eventType}:${JSON.stringify(event.payload)}:${event.timestamp.toISOString()}`;
    return crypto.createHash('sha256').update(rawContent).digest('hex');
  }

  /**
   * Archives historical events for aggregates that already have a verified snapshot.
   * Only events prior to the latest snapshot version are eligible for cold storage migration.
   * 
   * @param {Object} options
   * @param {Number} options.olderThanDays - Minimum age in days to qualify for archival
   * @param {Boolean} options.dryRun - If true, only reports eligible events without deleting
   */
  static async archiveHistoricalEvents({ olderThanDays = 30, dryRun = false } = {}) {
    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
    const batchId = `ARCHIVE-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    logger.info(`[EventArchivalService] Starting archival batch ${batchId} (Cutoff: ${cutoffDate.toISOString()}, dryRun: ${dryRun})`);

    const snapshots = await Snapshot.find().exec();
    let totalEligible = 0;
    let totalArchived = 0;

    for (const snapshot of snapshots) {
      // Safe boundary: only archive events whose version is STRICTLY LESS than the snapshot's version
      // AND timestamp is older than cutoffDate.
      const query = {
        aggregateId: snapshot.aggregateId,
        version: { $lt: snapshot.version },
        timestamp: { $lte: cutoffDate }
      };

      const eligibleEvents = await Event.find(query).sort({ version: 1 }).exec();
      if (!eligibleEvents.length) continue;

      totalEligible += eligibleEvents.length;

      if (dryRun) {
        logger.info(`[EventArchivalService (DRY-RUN)] Aggregate ${snapshot.aggregateId}: ${eligibleEvents.length} events eligible.`);
        continue;
      }

      // Prepare batch documents with cryptographic checksums
      const archiveDocs = eligibleEvents.map(ev => ({
        originalEventId: ev._id,
        aggregateId: ev.aggregateId,
        aggregateType: ev.aggregateType,
        eventType: ev.eventType,
        payload: ev.payload,
        version: ev.version,
        actor: ev.actor,
        originalTimestamp: ev.timestamp,
        archiveBatchId: batchId,
        checksum: this.computeChecksum(ev)
      }));

      // 1. Insert into cold storage
      await EventArchive.insertMany(archiveDocs, { ordered: true });

      // 2. Safely purge from hot EventStore
      const deleteResult = await Event.deleteMany({
        _id: { $in: eligibleEvents.map(e => e._id) }
      });

      totalArchived += deleteResult.deletedCount;
      logger.info(`[EventArchivalService] Archived & purged ${deleteResult.deletedCount} events for aggregate ${snapshot.aggregateId}`);
    }

    logger.info(`[EventArchivalService] Batch complete. Eligible: ${totalEligible}, Archived: ${totalArchived}`);
    return { batchId, totalEligible, totalArchived, dryRun };
  }

  /**
   * Retrieves events from both hot store and cold archive for full forensic audit history.
   */
  static async getFullAuditTrailWithArchive(aggregateId) {
    const [coldEvents, hotEvents] = await Promise.all([
      EventArchive.find({ aggregateId }).sort({ version: 1 }).exec(),
      Event.find({ aggregateId }).sort({ version: 1 }).exec()
    ]);

    return {
      aggregateId,
      coldEventCount: coldEvents.length,
      hotEventCount: hotEvents.length,
      totalEvents: coldEvents.length + hotEvents.length,
      stream: [...coldEvents, ...hotEvents]
    };
  }
}

export default EventArchivalService;
