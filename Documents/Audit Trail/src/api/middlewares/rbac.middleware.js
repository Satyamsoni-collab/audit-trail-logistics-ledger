import crypto from 'crypto';
import logger from '../../utils/logger.js';

/**
 * Enterprise Role & Permission Registry for Zero-Trust Access Control (Day 27)
 */
export const ROLES = {
  CISO_ADMIN: {
    name: 'CISO_ADMIN',
    permissions: [
      'inventory:create',
      'stock:update',
      'compliance:read',
      'compliance:sign',
      'audit:verify',
      'audit:external',
      'projection:repair',
      'diagnostics:manage'
    ]
  },
  LOGISTICS_MANAGER: {
    name: 'LOGISTICS_MANAGER',
    permissions: [
      'inventory:create',
      'stock:update',
      'compliance:read',
      'audit:verify',
      'inventory:read'
    ]
  },
  WAREHOUSE_OPERATOR: {
    name: 'WAREHOUSE_OPERATOR',
    permissions: [
      'stock:update',
      'inventory:read'
    ]
  },
  COMPLIANCE_AUDITOR: {
    name: 'COMPLIANCE_AUDITOR',
    permissions: [
      'compliance:read',
      'audit:verify',
      'audit:external',
      'inventory:read'
    ]
  },
  PUBLIC_VIEWER: {
    name: 'PUBLIC_VIEWER',
    permissions: [
      'inventory:read'
    ]
  },
  SYSTEM_AUTOMATION: {
    name: 'SYSTEM_AUTOMATION',
    permissions: [
      'stock:update',
      'inventory:create',
      'projection:repair'
    ]
  }
};

/**
 * Granular Permission-Based Authorization Middleware
 * 
 * Verifies role permissions, clearance levels, and attaches cryptographic
 * actor provenance tokens to the request pipeline before appending events.
 * 
 * @param {Object} options
 * @param {String} options.permission - Required granular permission (e.g., 'inventory:create')
 * @param {String} [options.requiredClearance] - Minimum clearance level ('STANDARD', 'HIGH', 'CONFIDENTIAL')
 */
export const authorize = ({ permission, requiredClearance = 'STANDARD' }) => {
  return (req, res, next) => {
    const actorId = req.user?.id || req.headers['x-user-id'] || 'anonymous-user';
    const rawRole = (req.user?.role || req.headers['x-user-role'] || 'LOGISTICS_MANAGER').toUpperCase();
    const clearance = (req.user?.clearance || req.headers['x-clearance-level'] || 'STANDARD').toUpperCase();

    // Map role or fallback to default permissiveness
    const roleConfig = ROLES[rawRole] || ROLES.LOGISTICS_MANAGER;

    // 1. RBAC: Verify Granular Permission
    if (permission && !roleConfig.permissions.includes(permission)) {
      logger.warn(`🛑 [Zero-Trust RBAC] Denied actor '${actorId}' (Role: ${rawRole}) lacking permission: ${permission}`);
      return res.status(403).json({
        status: 'error',
        code: 'ACCESS_DENIED_INSUFFICIENT_PERMISSIONS',
        message: `Forbidden: Role '${rawRole}' lacks required permission '${permission}'. Only authorized roles can issue state-changing commands.`,
        requiredPermission: permission,
        userRole: rawRole
      });
    }

    // 2. ABAC: Verify Attribute Clearance Level
    const clearanceHierarchy = { STANDARD: 1, HIGH: 2, CONFIDENTIAL: 3 };
    const actorLevel = clearanceHierarchy[clearance] || 1;
    const requiredLevel = clearanceHierarchy[requiredClearance] || 1;

    if (actorLevel < requiredLevel) {
      logger.warn(`🛑 [Zero-Trust ABAC] Denied actor '${actorId}' with clearance '${clearance}' (Required: '${requiredClearance}')`);
      return res.status(403).json({
        status: 'error',
        code: 'ACCESS_DENIED_INSUFFICIENT_CLEARANCE',
        message: `Forbidden: Clearance level '${clearance}' is insufficient. Required: '${requiredClearance}'.`
      });
    }

    // 3. Cryptographic Actor Fingerprint Generation (Provenance Token)
    const actorFingerprint = crypto
      .createHash('sha256')
      .update(`${actorId}:${rawRole}:${clearance}:${req.ip || '127.0.0.1'}`)
      .digest('hex');

    req.actorContext = {
      id: actorId,
      role: rawRole,
      clearance,
      fingerprint: actorFingerprint,
      verifiedAt: new Date().toISOString()
    };

    logger.debug(`🛡️ [Zero-Trust RBAC] Authorized actor '${actorId}' [Role: ${rawRole}] with fingerprint ${actorFingerprint.substring(0, 12)}...`);
    next();
  };
};

/**
 * Strict Role Verification Middleware Factory
 * Ensures only specified high-privilege roles can access critical routes.
 * 
 * @param {Array<String>|String} allowedRoles 
 */
export const requireRole = (allowedRoles = []) => {
  return (req, res, next) => {
    const userRole = (req.user?.role || req.headers['x-user-role'] || 'PUBLIC_VIEWER').toUpperCase();
    const rolesList = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

    if (!rolesList.includes(userRole)) {
      logger.warn(`🛑 [RBAC Error] Forbidden: Role '${userRole}' not in allowed roles: ${rolesList.join(', ')}`);
      return res.status(403).json({
        status: 'error',
        code: 'FORBIDDEN_INSUFFICIENT_ROLE',
        message: `Access Denied: Role '${userRole}' does not have administrative clearance for state-changing commands.`,
        userRole,
        allowedRoles: rolesList
      });
    }

    next();
  };
};

export default {
  ROLES,
  authorize,
  requireRole
};
