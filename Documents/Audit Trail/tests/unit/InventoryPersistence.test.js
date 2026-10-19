
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import InventoryItem from '../../src/models/readModels/InventoryItem.js';

// Load .env from the repository root
dotenv.config({
  path: fileURLToPath(new URL('../../../../.env', import.meta.url))
});

describe('Inventory Read Model - Atlas Persistence', () => {
  let connection;
  let TestInventory;

  beforeAll(async () => {
    const uri = process.env.MONGODB_TEST_URI;

    if (!uri) {
      throw new Error('MONGODB_TEST_URI is missing');
    }

    const parsedURI = new URL(uri);

    // Prevent connection to the main database
    if (parsedURI.pathname !== '/audit_trail_test') {
      throw new Error('STOP: Only audit_trail_test is allowed');
    }

    // Connect explicitly to the isolated test database
    connection = await mongoose.createConnection(uri, {
      dbName: 'audit_trail_test',
      autoIndex: false,
      serverSelectionTimeoutMS: 10000
    }).asPromise();

    if (connection.name !== 'audit_trail_test') {
      await connection.close();
      connection = null;
      throw new Error('STOP: Connected to unexpected database');
    }

    // Use only the dedicated test collection
    TestInventory = connection.model(
      'InventoryPersistenceTest',
      InventoryItem.schema,
      'inventory_readmodel_test'
    );
  });

  afterAll(async () => {
    if (connection) {
      await connection.close();
    }
  });

  it('should save and retrieve an inventory projection', async () => {
    const aggregateId = `test-${randomUUID()}`;

    const item = new TestInventory({
      aggregateId,
      sku: 'TEST-SKU-101',
      name: 'Test Inventory Item',
      quantity: 20,
      location: 'Test Warehouse',
      status: 'AVAILABLE',
      lastProcessedVersion: 1
    });

    try {
      await item.save();

      const stored = await TestInventory.findOne({ aggregateId });

      expect(stored).not.toBeNull();
      expect(stored.sku).toBe('TEST-SKU-101');
      expect(stored.quantity).toBe(20);
      expect(stored.location).toBe('Test Warehouse');
      expect(stored.status).toBe('AVAILABLE');
      expect(stored.lastProcessedVersion).toBe(1);
    } finally {
      // Remove only this test's record
      await TestInventory.deleteOne({ aggregateId });
    }
  });
});
