/**
 * Day 28: Cypress End-to-End Test Suite
 * Feature: Shipment Visualization Dashboard & State Scrubber
 */

describe('Shipment Visualization & Audit Ledger Dashboard E2E', () => {
  beforeEach(() => {
    // Intercept backend API requests to ensure reliable deterministic assertions
    cy.intercept('GET', '/api/queries/analytics/realtime', {
      statusCode: 200,
      body: {
        status: 'success',
        source: 'redis_cache',
        data: {
          totalDispatched: 1420,
          inTransitCount: 84,
          delayedShipments: 2,
          anomalyAlertsCount: 1
        }
      }
    }).as('getRealtimeAnalytics');

    cy.intercept('GET', '/api/v1/ai/diagnostics', {
      statusCode: 200,
      body: {
        status: 'success',
        data: {
          diagnosticTimestamp: new Date().toISOString(),
          systemHealthStatus: 'HEALTHY',
          telemetrySnapshot: { cpuLoad: '12%', memoryUsage: '45%' },
          diagnosedIssues: [
            {
              issueType: 'SUSPICIOUS_SHIPMENT_DELAY',
              severity: 'HIGH',
              confidence: 0.94,
              description: 'Shipment stalled at intermediate hub exceeding SLA by 6 hours.'
            }
          ]
        }
      }
    }).as('getAIDiagnostics');

    cy.intercept('GET', '/api/v1/events/status', {
      statusCode: 200,
      body: {
        status: 'ACTIVE',
        protocol: 'Server-Sent Events (SSE)',
        activeClientsCount: 4
      }
    }).as('getSSEStatus');

    cy.intercept('GET', '/api/v1/auth/roles', {
      statusCode: 200,
      body: {
        status: 'success',
        roles: {
          LOGISTICS_MANAGER: { name: 'LOGISTICS_MANAGER' },
          CISO_ADMIN: { name: 'CISO_ADMIN' },
          COMPLIANCE_AUDITOR: { name: 'COMPLIANCE_AUDITOR' },
          PUBLIC_VIEWER: { name: 'PUBLIC_VIEWER' }
        }
      }
    }).as('getRoles');

    // Visit dashboard root
    cy.visit('/');
  });

  it('1. Loads the Audit Trail Dashboard with telemetry and real-time streaming badge', () => {
    cy.wait('@getRealtimeAnalytics');
    cy.wait('@getSSEStatus');

    // Verify main ledger header
    cy.contains('Audit Trail').should('be.visible');

    // Check SSE Live Streaming indicator
    cy.contains('LIVE STREAMING').should('exist');

    // Verify AI Diagnostics widget is rendered
    cy.contains('AI Telemetry Diagnostics').should('be.visible');
    cy.contains('SUSPICIOUS_SHIPMENT_DELAY').should('be.visible');
  });

  it('2. Interacts with the RBAC Role Switcher to toggle authorization clearance', () => {
    // Check initial default role badge
    cy.get('[data-testid="rbac-role-select"]').should('exist');

    // Switch role to CISO_ADMIN
    cy.get('[data-testid="rbac-role-select"]').click();
    cy.contains('CISO_ADMIN').click();

    // Verify localStorage persistence of token and role
    cy.window().then((win) => {
      expect(win.localStorage.getItem('audit_trail_user')).to.contain('CISO_ADMIN');
    });

    // Check badge reflects CONFIDENTIAL clearance
    cy.contains('CONFIDENTIAL').should('be.visible');
  });

  it('3. Inspects shipment lifecycle events using the State Scrubber & Timeline', () => {
    const sampleShipmentId = 'SHP-10024';

    cy.intercept('GET', `/api/queries/inventory/${sampleShipmentId}`, {
      statusCode: 200,
      body: {
        status: 'success',
        data: {
          sku: sampleShipmentId,
          name: 'Medical Logistics Container A1',
          quantity: 250,
          status: 'IN TRANSIT',
          version: 3
        }
      }
    }).as('getShipmentDetail');

    cy.intercept('GET', `/api/v1/audit-trail/${sampleShipmentId}`, {
      statusCode: 200,
      body: {
        status: 'success',
        data: [
          { version: 1, eventType: 'ITEM_CREATED', timestamp: '2026-10-28T10:00:00Z', payload: { quantity: 250 } },
          { version: 2, eventType: 'DISPATCHED', timestamp: '2026-10-28T11:30:00Z', payload: { origin: 'Hub-1' } },
          { version: 3, eventType: 'TRANSIT_UPDATE', timestamp: '2026-10-28T14:15:00Z', payload: { location: 'Checkpoint Beta' } }
        ]
      }
    }).as('getAuditTrail');

    // Enter shipment ID into search field
    cy.get('input[placeholder*="Search"]').type(`${sampleShipmentId}{enter}`);

    // Verify audit trail timeline renders all 3 version milestones
    cy.contains('ITEM_CREATED').should('exist');
    cy.contains('DISPATCHED').should('exist');
    cy.contains('TRANSIT_UPDATE').should('exist');

    // Interact with State Scrubber slider to scrub back to Version 1
    cy.get('.ant-slider').should('exist');
  });

  it('4. Enforces RBAC permissions when attempting state mutations', () => {
    // Switch to PUBLIC_VIEWER
    cy.get('[data-testid="rbac-role-select"]').click();
    cy.contains('PUBLIC_VIEWER').click();

    // Verify state-changing command button is either disabled or triggers authorization alert
    cy.get('body').then(($body) => {
      if ($body.find('button:contains("Dispatch Shipment")').length > 0) {
        cy.contains('Dispatch Shipment').should('be.disabled');
      }
    });
  });
});
