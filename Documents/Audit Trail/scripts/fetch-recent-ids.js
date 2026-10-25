import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Event from '../src/models/events/EventStore.js';
import InventoryItemReadModel from '../src/models/readModels/InventoryItem.js';

dotenv.config();

const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/audit-trail-ledger';

async function fetchRecentIds() {
  try {
    await mongoose.connect(mongoURI, { serverSelectionTimeoutMS: 3000 });
    console.log('Connected to MongoDB at', mongoURI);

    // 1. Query EventStore for Shipment aggregateType or IDs containing "shipment"
    const shipmentEvents = await Event.find({
      $or: [
        { aggregateType: 'Shipment' },
        { aggregateId: { $regex: /shipment/i } },
        { eventType: { $regex: /shipment/i } }
      ]
    })
      .sort({ timestamp: -1 })
      .limit(10)
      .lean();

    const distinctShipmentIds = [...new Set(shipmentEvents.map(e => e.aggregateId))].slice(0, 3);

    // 2. Query all distinct aggregate types and 3 most recent generic aggregate IDs
    const recentEvents = await Event.find()
      .sort({ timestamp: -1 })
      .limit(20)
      .lean();
    const distinctRecentEventIds = [...new Set(recentEvents.map(e => e.aggregateId))].slice(0, 3);

    // 3. Query InventoryItem Read Model (the primary query projection in CQRS)
    const recentReadModels = await InventoryItemReadModel.find()
      .sort({ updatedAt: -1, createdAt: -1 })
      .limit(3)
      .lean();

    console.log('\n--- DATABASE SCAN RESULTS ---');
    console.log('Shipment-Specific Aggregate IDs (from EventStore):', distinctShipmentIds.length ? distinctShipmentIds : 'None found');
    console.log('3 Most Recent General Aggregate IDs (from EventStore):', distinctRecentEventIds);
    console.log('3 Most Recent Read-Model Inventory Items:');
    recentReadModels.forEach((item, index) => {
      console.log(`  [${index + 1}] ID (aggregateId): ${item.aggregateId} | SKU: ${item.sku} | Name: ${item.name} | Status: ${item.status} | Qty: ${item.quantity}`);
    });

  } catch (err) {
    console.error('Error connecting to database or fetching IDs:', err.message);
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
    process.exit(0);
  }
}

fetchRecentIds();
