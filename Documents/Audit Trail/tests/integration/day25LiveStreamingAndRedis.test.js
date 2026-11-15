import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../src/app.js';
import cacheService from '../../src/config/redis.js';
import eventStreamService from '../../src/services/streaming/EventStreamService.js';
import SecurityAlert from '../../src/models/alerts/SecurityAlert.js';

describe('Day 25: Real-Time Event Streaming, AI Diagnostics, and Redis Caching', () => {
  beforeAll(async () => {
    // Ensure in-memory cache is clean
    await cacheService.del('cache:readmodel:analytics:realtime');
    await cacheService.del('cache:readmodel:inventory:SHP-10024');
    await cacheService.del('cache:audit-trail:SHP-10024');
  });

  afterAll(async () => {
    await cacheService.del('cache:readmodel:analytics:realtime');
  });

  describe('1. Real-Time Event Streaming (SSE)', () => {
    it('GET /api/v1/events/status should return active streaming status', async () => {
      const res = await request(app).get('/api/v1/events/status');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ACTIVE');
      expect(res.body.protocol).toContain('Server-Sent Events');
      expect(typeof res.body.activeClientsCount).toBe('number');
    });

    it('POST /api/v1/events/simulate should broadcast transit event to stream and message broker', async () => {
      const payload = {
        aggregateId: 'SHP-10024',
        eventType: 'TRANSIT_UPDATE',
        status: 'IN TRANSIT',
        location: 'Jaipur Highway Checkpoint',
        actor: 'test-broker-agent'
      };

      const res = await request(app)
        .post('/api/v1/events/simulate')
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.event.aggregateId).toBe('SHP-10024');
      expect(res.body.event.payload.location).toBe('Jaipur Highway Checkpoint');
    });
  });

  describe('2. AI Diagnostics Dashboard Widget & Anomaly Detection', () => {
    beforeEach(async () => {
      // Seed a test anomaly alert for suspicious delay
      try {
        if (mongoose.connection.readyState === 1) {
          await SecurityAlert.create({
            alertId: `ALT-TEST-${Date.now()}`,
            severity: 'HIGH',
            ruleCode: 'SUSPICIOUS_SHIPMENT_DELAY',
            message: 'Transit delay SLA violation: Stalled at checkpoint for 18h with 0 GPS pings.',
            aggregateId: 'SHP-10024',
            eventType: 'TRANSIT_UPDATE',
            actor: 'ai-telemetry-probe',
            details: { shipmentId: 'SHP-10024', delayHours: 18 }
          });
        }
      } catch (e) {
        // Ignore if db is mocked/disconnected
      }
    });

    it('GET /api/v1/ai/diagnostics should return system diagnostics with anomaly detection alerts', async () => {
      const res = await request(app).get('/api/v1/ai/diagnostics');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data).toHaveProperty('diagnosticTimestamp');
      expect(res.body.data).toHaveProperty('systemHealthStatus');
      expect(res.body.data).toHaveProperty('telemetrySnapshot');
      expect(Array.isArray(res.body.data.diagnosedIssues)).toBe(true);

      const issues = res.body.data.diagnosedIssues;
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]).toHaveProperty('issueType');
      expect(issues[0]).toHaveProperty('severity');
      expect(issues[0]).toHaveProperty('confidence');
    });
  });

  describe('3. Read-Model Caching (Redis)', () => {
    it('GET /api/queries/analytics/realtime should populate cache on miss and serve from cache on hit', async () => {
      // Step 1: Ensure cache is cleared
      await cacheService.del('cache:readmodel:analytics:realtime');

      // Step 2: First Call -> Cache Miss (sourced from database)
      const res1 = await request(app).get('/api/queries/analytics/realtime');
      expect(res1.status).toBe(200);
      expect(res1.body.status).toBe('success');
      expect(res1.body.source).toBe('database');
      expect(res1.body.data).toHaveProperty('metricKey');

      // Step 3: Second Call -> Cache Hit (sourced from cache)
      const res2 = await request(app).get('/api/queries/analytics/realtime');
      expect(res2.status).toBe(200);
      expect(res2.body.status).toBe('success');
      expect(res2.body.source).toBe('cache');
      expect(res2.body.data.metricKey).toBe('global_inventory_metrics');
    });
  });
});
