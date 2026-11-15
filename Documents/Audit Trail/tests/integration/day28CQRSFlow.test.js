import request from 'supertest';
import app from '../../src/app.js';
import Event from '../../src/models/events/EventStore.js';
import InventoryItemReadModel from '../../src/models/readModels/InventoryItem.js';
import cacheService from '../../src/config/redis.js';
import { signJWT } from '../../src/utils/jwt.js';

describe('Day 28: End-to-End CQRS & Event Sourcing Lifecycle Integration Test', () => {
  const managerToken = signJWT({
    id: 'usr-manager-day28',
    email: 'manager@audittrail.io',
    role: 'LOGISTICS_MANAGER',
    clearance: 'HIGH',
    permissions: ['inventory:create', 'stock:update', 'inventory:read']
  });

  beforeAll(async () => {
    // Ensure MongoDB compound unique indexes are built for concurrency control
    await Event.init();
    await InventoryItemReadModel.init();
  });

  it('verifies the full CQRS lifecycle: Command Dispatch -> Event Store -> Read Model -> Optimistic Concurrency', async () => {
    // -----------------------------------------------------------------
    // 1. Dispatch Command to create new aggregate (ITEM_CREATED)
    // -----------------------------------------------------------------
    const sku = `SKU-E2E-${Date.now()}`;
    const createRes = await request(app)
      .post('/api/commands/inventory')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        sku,
        name: 'Autonomous Robotics Battery Module',
        location: 'Zone-North-Warehouse'
      });

    expect(createRes.status).toBe(202);
    expect(createRes.body).toHaveProperty('aggregateId');
    expect(createRes.body.version).toBe(1);

    const aggregateId = createRes.body.aggregateId;

    // Verify EventStore persistence (Append-Only Log)
    const event1 = await Event.findOne({ aggregateId, version: 1 });
    expect(event1).not.toBeNull();
    expect(event1.eventType).toBe('ITEM_CREATED');
    expect(event1.version).toBe(1);
    expect(event1.payload.sku).toBe(sku);
    expect(event1.hash).toBeDefined();

    // -----------------------------------------------------------------
    // 2. Asynchronous Read Model Projection
    // -----------------------------------------------------------------
    let readModel = null;
    for (let i = 0; i < 20; i++) {
      readModel = await InventoryItemReadModel.findOne({ aggregateId });
      if (readModel) break;
      await new Promise((r) => setTimeout(r, 60));
    }

    expect(readModel).not.toBeNull();
    expect(readModel.sku).toBe(sku);
    expect(readModel.quantity).toBe(0);
    expect(readModel.status).toBe('AVAILABLE');

    // Invalidate Redis cache to ensure fresh query read
    await cacheService.del(`cache:readmodel:inventory:${aggregateId}`);
    await cacheService.del(`cache:inventory:${aggregateId}`);

    // Verify Query API retrieval
    const queryRes = await request(app)
      .get(`/api/queries/inventory/${aggregateId}`)
      .set('Authorization', `Bearer ${managerToken}`);

    expect(queryRes.status).toBe(200);
    expect(queryRes.body.data.aggregateId).toBe(aggregateId);
    expect(queryRes.body.data.sku).toBe(sku);
    expect(queryRes.body.data.quantity).toBe(0);

    // -----------------------------------------------------------------
    // 3. State Mutation: Dispatch Stock Added (+150) with expectedVersion: 1
    // -----------------------------------------------------------------
    const stockRes = await request(app)
      .post(`/api/commands/inventory/${aggregateId}/stock`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        quantityChange: 150,
        expectedVersion: 1,
        reason: 'Initial warehouse replenishment'
      });

    expect(stockRes.status).toBe(202);
    expect(stockRes.body.version).toBe(2);

    // Verify second chained event in EventStore
    const event2 = await Event.findOne({ aggregateId, version: 2 });
    expect(event2).not.toBeNull();
    expect(event2.eventType).toBe('STOCK_ADDED');
    expect(event2.version).toBe(2);
    expect(event2.previousHash).toBe(event1.hash); // Chained cryptographic link

    // Allow projector to process mutation
    for (let i = 0; i < 20; i++) {
      const updatedModel = await InventoryItemReadModel.findOne({ aggregateId });
      if (updatedModel && updatedModel.quantity === 150) break;
      await new Promise((r) => setTimeout(r, 60));
    }

    // Verify Query API reflects updated quantity (150) and status ('AVAILABLE')
    await cacheService.del(`cache:readmodel:inventory:${aggregateId}`);
    await cacheService.del(`cache:inventory:${aggregateId}`);

    const queryRes2 = await request(app).get(`/api/queries/inventory/${aggregateId}`);
    expect(queryRes2.status).toBe(200);
    expect(queryRes2.body.data.quantity).toBe(150);
    expect(queryRes2.body.data.status).toBe('AVAILABLE');

    // -----------------------------------------------------------------
    // 4. Optimistic Concurrency Control (Version Conflict Detection)
    // -----------------------------------------------------------------
    // Attempting mutation with expectedVersion: 1 when active version is already 2
    const conflictRes = await request(app)
      .post(`/api/commands/inventory/${aggregateId}/stock`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        quantityChange: 50,
        expectedVersion: 1, // Stale optimistic lock version!
        reason: 'Simultaneous duplicate transaction'
      });

    expect(conflictRes.status).toBe(409);
    expect(conflictRes.body.code).toBe('CONCURRENCY_CONFLICT');
  });
});
