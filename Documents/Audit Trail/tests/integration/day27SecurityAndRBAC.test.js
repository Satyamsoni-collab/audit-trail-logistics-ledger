import request from 'supertest';
import app from '../../src/app.js';
import { signJWT, ENTERPRISE_USERS } from '../../src/utils/jwt.js';

describe('Day 27: API Security Hardening, Redis Rate Limiting & RBAC', () => {
  // Pre-generate tokens for test scenarios
  const logisticsManagerToken = signJWT({
    id: 'usr-admin-01',
    email: 'admin@audittrail.io',
    role: 'LOGISTICS_MANAGER',
    clearance: 'HIGH',
    permissions: ['inventory:create', 'stock:update', 'compliance:read', 'inventory:read']
  });

  const cisoAdminToken = signJWT({
    id: 'usr-ciso-02',
    email: 'ciso@audittrail.io',
    role: 'CISO_ADMIN',
    clearance: 'CONFIDENTIAL',
    permissions: ['inventory:create', 'stock:update', 'compliance:read', 'compliance:sign', 'audit:verify']
  });

  const viewerToken = signJWT({
    id: 'usr-viewer-04',
    email: 'viewer@audittrail.io',
    role: 'PUBLIC_VIEWER',
    clearance: 'STANDARD',
    permissions: ['inventory:read']
  });

  describe('1. API Security & Hardening (Helmet, Strict CORS, Size Limits & Sanitization)', () => {
    it('should include Helmet production security headers on HTTP responses', async () => {
      const res = await request(app).get('/api/health');

      expect(res.status).toBe(200);
      expect(res.headers).toHaveProperty('x-frame-options');
      expect(res.headers['x-frame-options']).toBe('DENY');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers).toHaveProperty('strict-transport-security');
      expect(res.headers['strict-transport-security']).toContain('max-age=31536000');
    });

    it('should enforce CORS headers for whitelisted React frontend origins', async () => {
      const res = await request(app)
        .get('/api/health')
        .set('Origin', 'http://localhost:5173');

      expect(res.status).toBe(200);
      expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
      expect(res.headers['access-control-allow-credentials']).toBe('true');
    });

    it('should reject request payloads exceeding the 10kb limit with 413 Payload Too Large', async () => {
      const largePayload = {
        data: 'X'.repeat(12 * 1024) // 12 KB payload
      };

      const res = await request(app)
        .post('/api/commands/inventory')
        .set('Authorization', `Bearer ${logisticsManagerToken}`)
        .set('Content-Type', 'application/json')
        .send(JSON.stringify(largePayload));

      expect(res.status).toBe(413);
    });

    it('should intercept and block prototype pollution attacks with 400 Bad Request', async () => {
      const maliciousPayload = JSON.parse('{"name": "Security Test", "__proto__": {"admin": true}}');

      const res = await request(app)
        .post('/api/commands/inventory')
        .set('Authorization', `Bearer ${logisticsManagerToken}`)
        .send(maliciousPayload);

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('MALFORMED_PAYLOAD');
      expect(res.body.message).toContain('Reserved prototype keys are prohibited');
    });
  });

  describe('2. Rate Limiting & Throttling', () => {
    it('should expose RateLimit compliance headers on protected command routes', async () => {
      const res = await request(app)
        .post('/api/commands/inventory')
        .set('Authorization', `Bearer ${logisticsManagerToken}`)
        .send({
          sku: `SKU-RL-${Date.now()}`,
          name: 'Rate Limit Test Item',
          location: 'Hub Delta'
        });

      // Status could be 202 or other depending on db state, but RateLimit headers must be present
      expect(res.headers).toHaveProperty('ratelimit-limit');
      expect(res.headers).toHaveProperty('ratelimit-remaining');
    });

    it('should expose RateLimit headers on query read routes', async () => {
      const res = await request(app).get('/api/queries/inventory');

      expect(res.headers).toHaveProperty('ratelimit-limit');
      expect(res.headers).toHaveProperty('ratelimit-remaining');
    });
  });

  describe('3. Authentication & RBAC (Role-Based Access Control)', () => {
    it('POST /api/v1/auth/login should authenticate credentials and issue a valid enterprise JWT token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@audittrail.io',
          password: 'Admin@Password123'
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body).toHaveProperty('token');
      expect(res.body.tokenType).toBe('Bearer');
      expect(res.body.user.role).toBe('LOGISTICS_MANAGER');
      expect(res.body.user.permissions).toContain('inventory:create');
    });

    it('POST /api/v1/auth/login should reject invalid credentials with 401', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@audittrail.io',
          password: 'WrongPassword'
        });

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('INVALID_PASSWORD');
    });

    it('GET /api/v1/auth/me should return authenticated claims when valid JWT is supplied', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${cisoAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.user.role).toBe('CISO_ADMIN');
      expect(res.body.user.clearance).toBe('CONFIDENTIAL');
    });

    it('POST /api/commands/inventory should reject unauthenticated requests with 401', async () => {
      const res = await request(app)
        .post('/api/commands/inventory')
        .send({
          sku: 'SKU-UNAUTH',
          name: 'Unauthorized Item',
          location: 'Unknown'
        });

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('UNAUTHORIZED_MISSING_TOKEN');
    });

    it('POST /api/commands/inventory should reject PUBLIC_VIEWER role with 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/commands/inventory')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({
          sku: 'SKU-VIEWER-ATTEMPT',
          name: 'Viewer Item Creation Attempt',
          location: 'Unauthorized Hub'
        });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('FORBIDDEN_INSUFFICIENT_ROLE');
      expect(res.body.message).toContain('does not have administrative clearance');
    });

    it('POST /api/commands/inventory should accept command when caller has LOGISTICS_MANAGER role', async () => {
      const res = await request(app)
        .post('/api/commands/inventory')
        .set('Authorization', `Bearer ${logisticsManagerToken}`)
        .send({
          sku: `SKU-DAY27-${Date.now()}`,
          name: 'Day 27 Secure Ledger Item',
          location: 'Secured Warehouse Zone 1'
        });

      expect(res.status).toBe(202);
      expect(res.body).toHaveProperty('aggregateId');
      expect(res.body.message).toContain('appended successfully');
    });

    it('GET /api/v1/auth/roles should expose the RBAC role directory and permission matrices', async () => {
      const res = await request(app).get('/api/v1/auth/roles');

      expect(res.status).toBe(200);
      expect(res.body.roles).toHaveProperty('CISO_ADMIN');
      expect(res.body.roles).toHaveProperty('LOGISTICS_MANAGER');
      expect(res.body.roles).toHaveProperty('PUBLIC_VIEWER');
    });
  });
});
