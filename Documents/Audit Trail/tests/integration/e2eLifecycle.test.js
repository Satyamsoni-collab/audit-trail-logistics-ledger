import request from 'supertest';
import app from '../../src/app.js';
import Event from '../../src/models/events/EventStore.js';
import InventoryItemReadModel from '../../src/models/readModels/InventoryItem.js';
import AnalyticsDashboardView from '../../src/models/readModels/AnalyticsDashboardView.js';
import SecurityAlert from '../../src/models/alerts/SecurityAlert.js';

describe('End-to-End (E2E) Lifecycle Integration Tests', () => {
  beforeEach(async () => {
    // Clean test collections before each test run
    await Event.deleteMany({});
    await InventoryItemReadModel.deleteMany({});
    await AnalyticsDashboardView.deleteMany({});
    await SecurityAlert.deleteMany({});
  });

  it('should execute full lifecycle: Command Dispatch -> Event Store Persistence -> Read Model Projection -> Cryptographic Audit Trail', async () => {
    // -------------------------------------------------------------
    // STEP 1: Dispatch Command to Create Inventory Item
    // -------------------------------------------------------------
    const createRes = await request(app)
      .post('/api/commands/inventory')
      .set('Authorization', 'Bearer test-lead-token')
      .set('x-user-id', 'lead-architect')
      .send({
        sku: 'E2E-ITEM-900',
        name: 'Enterprise Logistics Cargo Container',
        location: 'Hub North Terminal'
      });

    expect(createRes.statusCode).toBe(202);
    expect(createRes.body.status).toBe('CommandAccepted');
    expect(createRes.body.aggregateId).toBeDefined();

    const aggregateId = createRes.body.aggregateId;

    // -------------------------------------------------------------
    // STEP 2: Verify Event Store Persistence & Cryptographic Genesis
    // -------------------------------------------------------------
    const event1 = await Event.findOne({ aggregateId, version: 1 });
    expect(event1).toBeDefined();
    expect(event1.eventType).toBe('ITEM_CREATED');
    expect(event1.actor).toBe('lead-architect');
    expect(event1.previousHash).toBe('GENESIS');
    expect(event1.hash).toBeDefined();
    expect(event1.hash.length).toBe(64); // SHA-256 length

    // Allow projector 50ms to asynchronously process
    await new Promise(r => setTimeout(r, 60));

    // -------------------------------------------------------------
    // STEP 3: Verify Query Read Model (Materialized View)
    // -------------------------------------------------------------
    const query1 = await request(app).get(`/api/queries/inventory/${aggregateId}`);
    expect(query1.statusCode).toBe(200);
    expect(query1.body.data.sku).toBe('E2E-ITEM-900');
    expect(query1.body.data.quantity).toBe(0);
    expect(query1.body.data.status).toBe('OUT_OF_STOCK');

    // -------------------------------------------------------------
    // STEP 4: Dispatch Command to Add Stock (+100)
    // -------------------------------------------------------------
    const stockAddRes = await request(app)
      .post(`/api/commands/inventory/${aggregateId}/stock`)
      .set('Authorization', 'Bearer test-lead-token')
      .set('x-user-id', 'warehouse-operator-1')
      .send({ quantityChange: 100 });

    expect(stockAddRes.statusCode).toBe(202);

    // -------------------------------------------------------------
    // STEP 5: Verify Chained Event Hashing
    // -------------------------------------------------------------
    const event2 = await Event.findOne({ aggregateId, version: 2 });
    expect(event2).toBeDefined();
    expect(event2.eventType).toBe('STOCK_ADDED');
    expect(event2.actor).toBe('warehouse-operator-1');
    expect(event2.previousHash).toBe(event1.hash); // Cryptographic link to parent!
    expect(event2.hash).toBeDefined();

    // Allow projector 50ms to asynchronously process
    await new Promise(r => setTimeout(r, 60));

    // Read Model should reflect 100 quantity and AVAILABLE status
    const query2 = await request(app).get(`/api/queries/inventory/${aggregateId}`);
    expect(query2.statusCode).toBe(200);
    expect(query2.body.data.quantity).toBe(100);
    expect(query2.body.data.status).toBe('AVAILABLE');

    // -------------------------------------------------------------
    // STEP 6: Query Audit Trail & Self-Healing Verification
    // -------------------------------------------------------------
    const auditRes = await request(app).get(`/api/v1/inventory/${aggregateId}/audit`);
    expect(auditRes.statusCode).toBe(200);
    expect(auditRes.body.totalEvents).toBe(2);

    const verifyRes = await request(app).get(`/api/v1/inventory/${aggregateId}/verify`);
    expect(verifyRes.statusCode).toBe(200);
    expect(verifyRes.body.isConsistent).toBe(true);
    expect(verifyRes.body.details.sourceOfTruth.quantity).toBe(100);

    // -------------------------------------------------------------
    // STEP 7: Regulatory Compliance Audit Report (JSON & CSV)
    // -------------------------------------------------------------
    const complianceJsonRes = await request(app).get(`/api/v1/compliance/report/${aggregateId}`);
    expect(complianceJsonRes.statusCode).toBe(200);
    expect(complianceJsonRes.body.data.reportMetadata.chainIntegrityStatus).toBe('PASSED_TAMPER_PROOF');
    expect(complianceJsonRes.body.data.aggregateSummary.currentStock).toBe(100);
    expect(complianceJsonRes.body.data.actorActivitySummary.length).toBeGreaterThanOrEqual(1);

    const complianceCsvRes = await request(app).get(`/api/v1/compliance/report/${aggregateId}?format=csv`);
    expect(complianceCsvRes.statusCode).toBe(200);
    expect(complianceCsvRes.headers['content-type']).toContain('text/csv');
    expect(complianceCsvRes.text).toContain('Version,Event Type,Actor');

    // -------------------------------------------------------------
    // STEP 8: Cryptographic Chain Verification Endpoint
    // -------------------------------------------------------------
    const chainAuditRes = await request(app).get(`/api/v1/compliance/verify-chain/${aggregateId}`);
    expect(chainAuditRes.statusCode).toBe(200);
    expect(chainAuditRes.body.data.isIntact).toBe(true);
    expect(chainAuditRes.body.data.violations.length).toBe(0);

    // -------------------------------------------------------------
    // STEP 9: Real-time Analytics Materialized View
    // -------------------------------------------------------------
    const analyticsRes = await request(app).get('/api/queries/analytics/realtime');
    expect(analyticsRes.statusCode).toBe(200);
    expect(analyticsRes.body.data.totalItemsTracked).toBeGreaterThanOrEqual(1);
    expect(analyticsRes.body.data.totalUnitsInStock).toBeGreaterThanOrEqual(100);
  });
});
