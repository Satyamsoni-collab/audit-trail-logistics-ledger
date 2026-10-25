import request from 'supertest';
import app from '../../src/app.js';
import Event from '../../src/models/events/EventStore.js';
import InventoryItemReadModel from '../../src/models/readModels/InventoryItem.js';
import SecurityAlert from '../../src/models/alerts/SecurityAlert.js';
import EventStoreService from '../../src/services/EventStoreService.js';
import AuditTrailService from '../../src/services/AuditTrailService.js';

describe('Chaos Engineering & Failure Recovery Integration Tests', () => {
  beforeEach(async () => {
    await Event.deleteMany({});
    await InventoryItemReadModel.deleteMany({});
    await SecurityAlert.deleteMany({});
  });

  describe('Optimistic Concurrency Control (OCC) Under Race Conditions', () => {
    it('should reject simultaneous writes attempting to append on the same version', async () => {
      const aggregateId = 'item-concurrency-test';

      // 1. Initial event (version 1)
      await EventStoreService.appendEvent({
        aggregateId,
        aggregateType: 'InventoryItem',
        eventType: 'ITEM_CREATED',
        payload: { sku: 'OCC-SKU', name: 'Race Item' },
        expectedVersion: 0,
        actor: 'user-init'
      });

      // 2. Simulate two concurrent processes trying to write at expectedVersion: 1
      const processA = EventStoreService.appendEvent({
        aggregateId,
        aggregateType: 'InventoryItem',
        eventType: 'STOCK_ADDED',
        payload: { quantityChange: 20 },
        expectedVersion: 1,
        actor: 'thread-A'
      });

      const processB = EventStoreService.appendEvent({
        aggregateId,
        aggregateType: 'InventoryItem',
        eventType: 'STOCK_ADDED',
        payload: { quantityChange: 30 },
        expectedVersion: 1,
        actor: 'thread-B'
      });

      // Exactly one should succeed, and one should fail with ConcurrencyException
      const results = await Promise.allSettled([processA, processB]);
      const fulfilled = results.filter(r => r.status === 'fulfilled');
      const rejected = results.filter(r => r.status === 'rejected');

      expect(fulfilled.length).toBe(1);
      expect(rejected.length).toBe(1);
      expect(rejected[0].reason.message).toContain('ConcurrencyException');
    });
  });

  describe('Cryptographic Tamper Detection & Forensic Integrity', () => {
    it('should detect malicious database tampering and identify the compromised event block', async () => {
      const aggregateId = 'tamper-proof-item';

      // Append 3 valid chained events
      await EventStoreService.appendEvent({
        aggregateId,
        aggregateType: 'InventoryItem',
        eventType: 'ITEM_CREATED',
        payload: { sku: 'TAMPER-1', name: 'Secure Vault Item' },
        expectedVersion: 0,
        actor: 'security-admin'
      });

      await EventStoreService.appendEvent({
        aggregateId,
        aggregateType: 'InventoryItem',
        eventType: 'STOCK_ADDED',
        payload: { quantityChange: 50 },
        expectedVersion: 1,
        actor: 'operator-1'
      });

      await EventStoreService.appendEvent({
        aggregateId,
        aggregateType: 'InventoryItem',
        eventType: 'STOCK_ADDED',
        payload: { quantityChange: 25 },
        expectedVersion: 2,
        actor: 'operator-2'
      });

      // Prior to tampering, verification must pass
      const initialAudit = await EventStoreService.verifyChainIntegrity(aggregateId);
      expect(initialAudit.isIntact).toBe(true);

      // SIMULATE ATTACK: Tamper directly with Version 2 payload in MongoDB
      await Event.updateOne(
        { aggregateId, version: 2 },
        { $set: { 'payload.quantityChange': 9999 } } // Malicious alteration!
      );

      // Re-run forensic chain audit
      const tamperedAudit = await EventStoreService.verifyChainIntegrity(aggregateId);
      expect(tamperedAudit.isIntact).toBe(false);
      expect(tamperedAudit.violations.length).toBeGreaterThan(0);
      expect(tamperedAudit.violations[0].version).toBe(2);
      expect(tamperedAudit.violations[0].reason).toContain('Cryptographic hash mismatch');
    });
  });

  describe('Projection Disaster Recovery & State Replay', () => {
    it('should reconstruct aggregate state in memory when read models are completely wiped', async () => {
      const aggregateId = 'disaster-recovery-item';

      // 1. Build an event stream
      await EventStoreService.appendEvent({
        aggregateId,
        aggregateType: 'InventoryItem',
        eventType: 'ITEM_CREATED',
        payload: { sku: 'REC-001', name: 'Recovery Item', location: 'Warehouse Z' },
        expectedVersion: 0
      });

      await EventStoreService.appendEvent({
        aggregateId,
        aggregateType: 'InventoryItem',
        eventType: 'STOCK_ADDED',
        payload: { quantityChange: 75 },
        expectedVersion: 1
      });

      await EventStoreService.appendEvent({
        aggregateId,
        aggregateType: 'InventoryItem',
        eventType: 'STOCK_REMOVED',
        payload: { quantityChange: -25 },
        expectedVersion: 2
      });

      // 2. SIMULATE CATASTROPHIC READ MODEL LOSS
      await InventoryItemReadModel.deleteMany({});
      const readModel = await InventoryItemReadModel.findOne({ aggregateId });
      expect(readModel).toBeNull(); // Projection is gone!

      // 3. Perform Event Sourcing Replay from Immutable Source of Truth
      const recoveredState = await AuditTrailService.replayState(aggregateId);
      expect(recoveredState).toBeDefined();
      expect(recoveredState.aggregateId).toBe(aggregateId);
      expect(recoveredState.version).toBe(3);
      expect(recoveredState.quantity).toBe(50); // 0 + 75 - 25 = 50
      expect(recoveredState.sku).toBe('REC-001');
    });
  });

  describe('Real-Time Anomaly Engine Alerting Under Shock Loads', () => {
    it('should trigger high-severity alerts when abnormal stock spikes are detected', async () => {
      const aggregateId = 'anomaly-spike-item';

      // Create item first
      await request(app)
        .post('/api/commands/inventory')
        .set('Authorization', 'Bearer token')
        .set('x-user-id', 'test-actor')
        .send({ sku: 'ANOMALY-1', name: 'Spike Test' });

      // Dispatch an abnormal stock adjustment (+999 units)
      await request(app)
        .post(`/api/commands/inventory/${aggregateId}/stock`)
        .set('Authorization', 'Bearer token')
        .set('x-user-id', 'test-actor')
        .send({ quantityChange: 999 });

      // Wait 50ms for Anomaly Detection Engine to evaluate
      await new Promise(r => setTimeout(r, 60));

      // Query compliance alerts
      const alertsRes = await request(app)
        .get(`/api/v1/compliance/alerts?aggregateId=${aggregateId}`);

      expect(alertsRes.statusCode).toBe(200);
      expect(alertsRes.body.count).toBeGreaterThanOrEqual(1);
      
      const spikeAlert = alertsRes.body.data.find(a => a.ruleCode === 'ABNORMAL_STOCK_SPIKE');
      expect(spikeAlert).toBeDefined();
      expect(spikeAlert.severity).toBe('HIGH');
    });
  });
});
