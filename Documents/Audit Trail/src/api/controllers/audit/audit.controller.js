import AuditTrailService from '../../../services/AuditTrailService.js';
import SnapshotService from '../../../services/SnapshotService.js';
import InventoryItemReadModel from '../../../models/readModels/InventoryItem.js';

export const getAuditHistory = async (req, res, next) => {
  try {
    const { itemId } = req.params;
    const history = await AuditTrailService.getAuditHistory(itemId);
    
    if (!history.length) {
      return res.status(404).json({ message: 'No audit history found for this item.' });
    }

    res.status(200).json({
      aggregateId: itemId,
      totalEvents: history.length,
      history
    });
  } catch (error) {
    next(error);
  }
};

export const verifyAggregateState = async (req, res, next) => {
  try {
    const { itemId } = req.params;
    
    // Get the replayed state (Source of Truth directly from Event Store)
    const replayedState = await AuditTrailService.replayState(itemId);
    
    if (!replayedState) {
      return res.status(404).json({ message: 'Item not found in Event Store.' });
    }

    // Get the current read model state (Projection view)
    const projectedState = await InventoryItemReadModel.findOne({ aggregateId: itemId });

    // Verify consistency
    const isConsistent = projectedState !== null && 
                         projectedState.quantity === replayedState.quantity && 
                         projectedState.lastProcessedVersion === replayedState.version;

    res.status(200).json({
      aggregateId: itemId,
      isConsistent,
      details: {
        sourceOfTruth: replayedState,
        projectedState: projectedState || null
      }
    });
  } catch (error) {
    next(error);
  }
};

export const createSnapshot = async (req, res, next) => {
  try {
    const { itemId } = req.params;
    // Assuming aggregateType is known. In a generic endpoint, we'd pass it.
    const snapshot = await SnapshotService.takeSnapshot(itemId, 'InventoryItem');
    
    if (!snapshot) {
      return res.status(404).json({ message: 'Item not found or has no events to snapshot.' });
    }

    res.status(201).json({
      message: 'Snapshot created successfully.',
      version: snapshot.version
    });
  } catch (error) {
    next(error);
  }
};
