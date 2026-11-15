
import Event from '../models/events/EventStore.js';
import Snapshot from '../models/events/Snapshot.js';
import { performance } from 'perf_hooks';

class AuditTrailService {

  /**
   * Retrieves chronological event history.
   */
  static async getAuditHistory(aggregateId) {
    return Event.find({ aggregateId })
      .sort({ version: 1 })
      .lean()
      .exec();
  }

  /**
   * Reconstructs item state using snapshots and delta events.
   */
  static async replayState(aggregateId, ignoreSnapshot = false) {
    const start = performance.now();

    let state = {
      aggregateId,
      quantity: 0,
      version: 0,
      history: []
    };

    let startVersion = 0;

    // 1. Load latest snapshot
    if (!ignoreSnapshot) {
      const latestSnapshot = await Snapshot.findOne({ aggregateId })
        .sort({ version: -1 })
        .lean()
        .exec();

      if (latestSnapshot) {
        state = {
          ...latestSnapshot.state,
          history: [...(latestSnapshot.state.history || [])]
        };

        startVersion = latestSnapshot.version;
        state.version = startVersion;

        console.log(
          `[Replay Optimizer] Snapshot found at version ${startVersion}.`
        );
      }
    }

    // 2. Fetch events after snapshot
    const events = await Event.find({
      aggregateId,
      version: { $gt: startVersion }
    })
      .sort({ version: 1 })
      .lean()
      .exec();

    // 3. Check whether item exists
    if (startVersion === 0 && events.length === 0) {
      return null;
    }

    // 4. Replay events
    for (const event of events) {
      const quantityChange = Number(event.payload?.quantityChange);

      switch (event.eventType) {

        case 'ITEM_CREATED':
          state.sku = event.payload.sku;
          state.name = event.payload.name;
          state.location = event.payload.location;
          state.quantity = Number(event.payload.quantity || 0);
          break;

        case 'STOCK_ADDED':
          if (!Number.isSafeInteger(quantityChange) || quantityChange <= 0) {
            throw new Error('Invalid quantityChange in STOCK_ADDED event');
          }

          state.quantity += quantityChange;
          break;

        case 'STOCK_REMOVED':
          if (!Number.isSafeInteger(quantityChange) || quantityChange >= 0) {
            throw new Error('Invalid quantityChange in STOCK_REMOVED event');
          }

          // Negative quantityChange represents stock removal.
          state.quantity += quantityChange;
          break;

        default:
          throw new Error(`Unknown event type: ${event.eventType}`);
      }

      state.version = event.version;

      state.history.push({
        eventType: event.eventType,
        timestamp: event.timestamp,
        version: event.version
      });
    }

    // 5. Calculate stock status
    state.status =
      state.quantity <= 0 ? 'OUT_OF_STOCK' : 'AVAILABLE';

    // 6. Performance logging
    const duration = (performance.now() - start).toFixed(2);

    console.log(
      `[Performance Log] Replayed ${events.length} events. ` +
      `Reached version ${state.version} in ${duration}ms.`
    );

    return state;
  }
}

export default AuditTrailService;
