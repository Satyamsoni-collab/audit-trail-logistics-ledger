import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'audit-trail-enterprise-secret-key-2026';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

/**
 * Signs a new JWT token with standard enterprise claims.
 * 
 * @param {Object} payload 
 * @param {String} [expiresIn] 
 * @returns {String} Signed JWT token
 */
export function signJWT(payload, expiresIn = JWT_EXPIRES_IN) {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn,
    algorithm: 'HS256',
    issuer: 'audit-trail-ledger',
    audience: 'audit-trail-api'
  });
}

/**
 * Verifies and decodes a JWT token.
 * 
 * @param {String} token 
 * @returns {Object} Decoded token payload
 */
export function verifyJWT(token) {
  return jwt.verify(token, JWT_SECRET, {
    issuer: 'audit-trail-ledger',
    audience: 'audit-trail-api'
  });
}

/**
 * Enterprise Directory of Seeded Identity Accounts for RBAC & Testing
 */
export const ENTERPRISE_USERS = [
  {
    id: 'usr-admin-01',
    email: 'admin@audittrail.io',
    password: 'Admin@Password123',
    role: 'LOGISTICS_MANAGER',
    clearance: 'HIGH',
    name: 'Satyam Soni (Lead Architect)'
  },
  {
    id: 'usr-ciso-02',
    email: 'ciso@audittrail.io',
    password: 'Ciso@Password123',
    role: 'CISO_ADMIN',
    clearance: 'CONFIDENTIAL',
    name: 'Security Officer (CISO)'
  },
  {
    id: 'usr-auditor-03',
    email: 'auditor@audittrail.io',
    password: 'Auditor@Password123',
    role: 'COMPLIANCE_AUDITOR',
    clearance: 'HIGH',
    name: 'External Compliance Auditor'
  },
  {
    id: 'usr-viewer-04',
    email: 'viewer@audittrail.io',
    password: 'Viewer@Password123',
    role: 'PUBLIC_VIEWER',
    clearance: 'STANDARD',
    name: 'Public Logistics Viewer'
  }
];

export default {
  signJWT,
  verifyJWT,
  ENTERPRISE_USERS
};
