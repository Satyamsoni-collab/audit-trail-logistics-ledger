import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Event from '../src/models/events/EventStore.js';
import InventoryItemReadModel from '../src/models/readModels/InventoryItem.js';

dotenv.config();

const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/audit-trail-ledger';

async function fetchRecentShipments() {
  try {
    await mongoose.connect(mongoURI, { serverSelectionTimeoutMS: 5000 });
    console.log('Connected to MongoDB at:', mongoURI);

    // 1. Fetch from EventStore where aggregateType is 'Shipment' or ID contains 'SHIP'
    const shipmentEvents = await Event.find({
      $or: [
        { aggregateType: 'Shipment' },
        { aggregateId: { $regex: /ship/i } }
      ]
    })
      .sort({ timestamp: -1 })
      .limit(10)
      .lean();

    const eventShipmentIds = [...new Set(shipmentEvents.map(e => e.aggregateId))].slice(0, 3);

    // 2. Fetch from Read Model (Materialized View)
    const readModels = await InventoryItemReadModel.find()
      .sort({ updatedAt: -1, createdAt: -1 })
      .limit(3)
      .lean();

    console.log('\n================================================================');
    console.log('📦 3 MOST RECENT SHIPMENT / AGGREGATE IDs FOR FRONTEND TESTING');
    console.log('================================================================');
    readModels.forEach((item, index) => {
      console.log(`\n[${index + 1}] ID (aggregateId): ${item.aggregateId}`);
      console.log(`    - SKU:      ${item.sku}`);
      console.log(`    - Name:     ${item.name}`);
      console.log(`    - Location: ${item.location}`);
      console.log(`    - Status:   ${item.status} (Units: ${item.quantity})`);
      console.log(`    - Test API: GET /api/queries/inventory/${item.aggregateId}`);
    });
    console.log('================================================================\n');

  } catch (err) {
    console.error('Error fetching shipment IDs:', err.message);
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
    process.exit(0);
  }
}

fetchRecentShipments();
