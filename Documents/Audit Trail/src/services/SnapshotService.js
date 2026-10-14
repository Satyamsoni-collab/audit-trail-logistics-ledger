import Snapshot from '../models/events/Snapshot.js';
import AuditTrailService from './AuditTrailService.js';
import { performance } from 'perf_hooks';

class SnapshotService {
  /**
   * Take a snapshot of an aggregate's state at its current version.
   * This is typically triggered by a scheduled job or after X events.
   * 
   * @param {String} aggregateId
   * @param {String} aggregateType
   */
  static async takeSnapshot(aggregateId, aggregateType) {
    const start = performance.now();
    console.log(`[SnapshotWorker] Initiating background snapshot for ${aggregateType} ${aggregateId}...`);

    try {
      // Replay full state to get the exact current truth, bypassing previous snapshots 
      // (or we can build on top of them, but bypassing ensures absolute integrity of the new snapshot)
      const state = await AuditTrailService.replayState(aggregateId, true); 
      
      if (!state) {
        console.log(`[SnapshotWorker] No events found for ${aggregateId}. Skipping snapshot.`);
        return null;
      }

      const snapshot = new Snapshot({
        aggregateId,
        aggregateType,
        version: state.version,
        state
      });

      await snapshot.save();
      
      const duration = (performance.now() - start).toFixed(2);
      console.log(`[Performance Log] 📸 Snapshot materialized for ${aggregateId} at version ${state.version} in ${duration}ms.`);
      
      return snapshot;
    } catch (error) {
      console.error(`[SnapshotWorker] ❌ Failed to take snapshot: ${error.message}`);
      throw error;
    }
  }
}

export default SnapshotService;
