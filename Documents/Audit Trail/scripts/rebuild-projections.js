import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { performance } from 'perf_hooks';

import Event from '../src/models/events/EventStore.js';
import EventArchive from '../src/models/events/EventArchive.js';
import InventoryItemReadModel from '../src/models/readModels/InventoryItem.js';
import AnalyticsDashboardView from '../src/models/readModels/AnalyticsDashboardView.js';

import InventoryProjector from '../src/events/projectors/InventoryProjector.js';
import RealTimeAnalyticsProjector from '../src/events/projectors/RealTimeAnalyticsProjector.js';

dotenv.config();

/**
 * 🔄 Projection Rebuilder & Synchronizer (CQRS Self-Healing Engine)
 * 
 * Reconstructs all read models (materialized views) from scratch
 * by replaying the complete immutable event stream sequentially.
 */
async function rebuildProjections() {
  console.log('===========================================================');
  console.log('🔄 STARTING CQRS PROJECTION REBUILD & SYNCHRONIZATION 🔄');
  console.log('===========================================================\n');

  const startTime = performance.now();
  const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/audit-trail-ledger';

  try {
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB.');

    // Step 1: Wipe all existing read models
    console.log('\n[1/3] Truncating all Read Model Collections (Materialized Views)...');
    const [deletedItems, deletedAnalytics] = await Promise.all([
      InventoryItemReadModel.deleteMany({}),
      AnalyticsDashboardView.deleteMany({})
    ]);
    console.log(`🧹 Dropped ${deletedItems.deletedCount} InventoryItem views.`);
    console.log(`🧹 Dropped ${deletedAnalytics.deletedCount} AnalyticsDashboard views.`);

    // Step 2: Fetch full unified event stream (Archived + Hot Store)
    console.log('\n[2/3] Fetching unified event stream in strict chronological order...');
    const [coldEvents, hotEvents] = await Promise.all([
      EventArchive.find().sort({ originalTimestamp: 1, version: 1 }).lean().exec(),
      Event.find().sort({ timestamp: 1, version: 1 }).lean().exec()
    ]);

    // Normalize cold events format
    const normalizedCold = coldEvents.map(e => ({
      ...e,
      timestamp: e.originalTimestamp
    }));

    const fullStream = [...normalizedCold, ...hotEvents].sort((a, b) => {
      const timeDiff = new Date(a.timestamp) - new Date(b.timestamp);
      return timeDiff !== 0 ? timeDiff : a.version - b.version;
    });

    console.log(`📊 Total events to replay: ${fullStream.length} (${coldEvents.length} archived + ${hotEvents.length} active hot)`);

    if (fullStream.length === 0) {
      console.log('⚠️ No events found in Event Store. Nothing to project.');
      return;
    }

    // Step 3: Sequential replay through projectors
    console.log('\n[3/3] Replaying events sequentially through projectors...');
    let processedCount = 0;

    for (const event of fullStream) {
      // 1. Replay through operational inventory projector
      if (event.eventType === 'ITEM_CREATED') {
        await InventoryProjector.onItemCreated(event);
      } else if (event.eventType === 'STOCK_ADDED' || event.eventType === 'STOCK_REMOVED') {
        await InventoryProjector.onStockUpdated(event);
      }

      // 2. Replay through real-time analytics projector
      if (event.eventType === 'ITEM_CREATED') {
        await RealTimeAnalyticsProjector.onItemCreated(event);
      } else if (event.eventType === 'STOCK_ADDED' || event.eventType === 'STOCK_REMOVED') {
        await RealTimeAnalyticsProjector.onStockMovement(event);
      }

      processedCount++;
    }

    const duration = ((performance.now() - startTime) / 1000).toFixed(2);
    const finalItemCount = await InventoryItemReadModel.countDocuments();
    const finalAnalytics = await AnalyticsDashboardView.findOne({ metricKey: 'global_inventory_metrics' });

    console.log('\n===========================================================');
    console.log('🎉 REBUILD COMPLETED SUCCESSFULLY!');
    console.log(`⏱️ Duration: ${duration}s`);
    console.log(`📦 Processed Events: ${processedCount}`);
    console.log(`📋 Materialized Inventory Items: ${finalItemCount}`);
    console.log(`📊 Synchronized Real-time Metrics:`, finalAnalytics ? {
      totalItemsTracked: finalAnalytics.totalItemsTracked,
      totalUnitsInStock: finalAnalytics.totalUnitsInStock,
      totalMovementsCount: finalAnalytics.totalMovementsCount
    } : 'None');
    console.log('===========================================================');

  } catch (error) {
    console.error('❌ Projection rebuild failed:', error);
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
    process.exit(0);
  }
}

rebuildProjections();
