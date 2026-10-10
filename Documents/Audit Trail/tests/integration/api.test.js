import request from 'supertest';
import app from '../../src/app.js';
import Event from '../../src/models/events/EventStore.js';
import InventoryItemReadModel from '../../src/models/readModels/InventoryItem.js';

describe('Audit Trail Ledger API Integration Tests', () => {
  beforeEach(async () => {
    // Clear databases
    await Event.deleteMany({});
    await InventoryItemReadModel.deleteMany({});
  });

  it('should pass the health check', async () => {
    const res = await request(app).get('/api/health');
    expect(res.statusCode).toEqual(200);
    expect(res.body.status).toBe('UP');
  });

  describe('Inventory CQRS Flow', () => {
    let createdItemId;

    it('should create an inventory item via Command and retrieve it via Query', async () => {
      // 1. Send Command to Create Item
      const createRes = await request(app)
        .post('/api/commands/inventory')
        .set('Authorization', 'Bearer test-token')
        .set('x-user-id', 'test-user')
        .send({
          sku: 'TEST-SKU-001',
          name: 'Integration Test Item',
          location: 'Warehouse A'
        });

      expect(createRes.statusCode).toEqual(202);
      expect(createRes.body.aggregateId).toBeDefined();
      createdItemId = createRes.body.aggregateId;

      // 2. Wait a few milliseconds for Projector to process event asynchronously
      await new Promise((resolve) => setTimeout(resolve, 50));

      // 3. Query the Read Model
      const queryRes = await request(app)
        .get(`/api/queries/inventory/${createdItemId}`);
      
      expect(queryRes.statusCode).toEqual(200);
      expect(queryRes.body.data.sku).toBe('TEST-SKU-001');
      expect(queryRes.body.data.quantity).toBe(0); // Initial quantity
      expect(queryRes.body.data.status).toBe('OUT_OF_STOCK');
    });

    it('should add stock and verify the audit trail', async () => {
      // Setup: Create item first
      const createRes = await request(app)
        .post('/api/commands/inventory')
        .set('Authorization', 'Bearer test-token')
        .set('x-user-id', 'test-user')
        .send({
          sku: 'TEST-SKU-002', name: 'Stock Test', location: 'A'
        });
      const itemId = createRes.body.aggregateId;

      // 1. Command: Add Stock
      const stockRes = await request(app)
        .post(`/api/commands/inventory/${itemId}/stock`)
        .set('Authorization', 'Bearer test-token')
        .set('x-user-id', 'test-user')
        .send({ quantityChange: 50 });
      
      expect(stockRes.statusCode).toEqual(202);

      // 2. Wait for projection
      await new Promise((resolve) => setTimeout(resolve, 50));

      // 3. Query the Audit Trail (Day 5 requirement check)
      const auditRes = await request(app).get(`/api/v1/inventory/${itemId}/audit`);
      expect(auditRes.statusCode).toEqual(200);
      expect(auditRes.body.totalEvents).toBe(2); // ITEM_CREATED and STOCK_ADDED
      expect(auditRes.body.history[1].eventType).toBe('STOCK_ADDED');
      expect(auditRes.body.history[1].version).toBe(2);

      // 4. Verify system state integrity via Replay API
      const verifyRes = await request(app).get(`/api/v1/inventory/${itemId}/verify`);
      expect(verifyRes.statusCode).toEqual(200);
      expect(verifyRes.body.isConsistent).toBe(true);
      expect(verifyRes.body.details.sourceOfTruth.quantity).toBe(50);
    });
  });
});
