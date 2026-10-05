import Event from '../models/events/EventStore.js';
import Snapshot from '../models/events/Snapshot.js';
import { performance } from 'perf_hooks';

class AuditTrailService {
  /**
   * Retrieves the chronological history of events for a specific item.
   */
  static async getAuditHistory(aggregateId) {
    return Event.find({ aggregateId }).sort({ timestamp: 1 }).exec();
  }

  /**
   * Optimally replays events to reconstruct state.
   * Loads the latest snapshot if available, and only replays delta events.
   * 
   * @param {String} aggregateId 
   * @param {Boolean} ignoreSnapshot - Bypass snapshot optimization (useful for creating snapshots)
   * @returns {Promise<Object>} The reconstructed state
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
    
    // 1. Snapshotting Optimization Layer
    if (!ignoreSnapshot) {
      const latestSnapshot = await Snapshot.findOne({ aggregateId }).sort({ version: -1 }).exec();
      if (latestSnapshot) {
        state = latestSnapshot.state;
        startVersion = latestSnapshot.version;
        console.log(`[Replay Optimizer] Snapshot found at version ${startVersion}. Skipping previous events.`);
      }
    }

    // 2. Fetch Delta Events (Only events after the snapshot version)
    const events = await Event.find({ 
      aggregateId, 
      version: { $gt: startVersion } 
    }).sort({ version: 1 }).exec();
    
    if (startVersion === 0 && (!events || events.length === 0)) {
      return null; // Item doesn't exist
    }

    // 3. Hydrate state with delta events
    for (const event of events) {
      switch (event.eventType) {
        case 'ITEM_CREATED':
          state.sku = event.payload.sku;
          state.name = event.payload.name;
          state.location = event.payload.location;
          state.quantity = event.payload.quantity || 0;
          break;
        case 'STOCK_ADDED':
          state.quantity += event.payload.quantityChange;
          break;
        case 'STOCK_REMOVED':
          state.quantity += event.payload.quantityChange;
          break;
        default:
          console.warn(`[Replay] Unknown event type: ${event.eventType}`);
      }
      state.version = event.version;
      
      // Ensure history array exists if snapshot didn't have it
      if (!state.history) state.history = [];
      state.history.push({ 
        eventType: event.eventType, 
        timestamp: event.timestamp,
        version: event.version 
      });
    }

    state.status = state.quantity <= 0 ? 'OUT_OF_STOCK' : 'AVAILABLE';
    
    const duration = (performance.now() - start).toFixed(2);
    console.log(`[Performance Log] ⚡ Replayed ${events.length} delta events to reach version ${state.version} in ${duration}ms.`);
    
    return state;
  }
}

export default AuditTrailService;
