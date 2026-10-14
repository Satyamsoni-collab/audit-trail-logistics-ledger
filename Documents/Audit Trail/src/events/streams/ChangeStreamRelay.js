import Event from '../../models/events/EventStore.js';
import logger from '../../utils/logger.js';

/**
 * ChangeStreamRelay
 * 
 * Implements the Change Data Capture (CDC) pattern using MongoDB Change Streams.
 * In a distributed setup, this service watches the EventStore collection in real-time
 * and relays newly inserted events onto a distributed backbone (Kafka, Redis Streams, or SSE).
 */
class ChangeStreamRelay {
  constructor() {
    this.changeStream = null;
    this.isListening = false;
  }

  /**
   * Initializes the Change Stream listener on the Event Store.
   * Note: MongoDB Change Streams require a replica set or MongoDB Atlas cluster.
   */
  start(onEventRelayed) {
    if (this.isListening) {
      logger.warn('[ChangeStreamRelay] Change stream is already running.');
      return;
    }

    try {
      // Watch for 'insert' operations on the EventStore collection
      this.changeStream = Event.watch([
        { $match: { operationType: 'insert' } }
      ], { fullDocument: 'updateLookup' });

      this.isListening = true;
      logger.info('📡 [ChangeStreamRelay] CDC Change Stream initialized on EventStore.');

      this.changeStream.on('change', (change) => {
        const newEvent = change.fullDocument;
        logger.info(`[ChangeStreamRelay] Captured event ${newEvent.eventType} for aggregate ${newEvent.aggregateId} [v${newEvent.version}]`);
        
        if (typeof onEventRelayed === 'function') {
          onEventRelayed(newEvent);
        }
      });

      this.changeStream.on('error', (err) => {
        logger.error(`[ChangeStreamRelay Error] Change stream failed: ${err.message}`);
        this.stop();
      });

    } catch (error) {
      // Local standalone MongoDB instances without replica sets cannot use Change Streams
      logger.warn(`[ChangeStreamRelay] Change Streams unavailable (requires replica set): ${error.message}`);
    }
  }

  stop() {
    if (this.changeStream) {
      this.changeStream.close();
      this.changeStream = null;
      this.isListening = false;
      logger.info('[ChangeStreamRelay] Change stream connection stopped.');
    }
  }
}

export default new ChangeStreamRelay();
