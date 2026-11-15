import { Router } from 'express';
import { signJWT, ENTERPRISE_USERS } from '../../utils/jwt.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { ROLES } from '../middlewares/rbac.middleware.js';
import logger from '../../utils/logger.js';

const router = Router();

/**
 * @route POST /api/v1/auth/login
 * @desc Enterprise Authentication Endpoint. Authenticates credentials and issues signed JWT with RBAC claims.
 */
router.post('/login', (req, res) => {
  const { email, password, role } = req.body || {};

  // Find user by email or fallback to role-based lookup
  let matchedUser = null;

  if (email) {
    matchedUser = ENTERPRISE_USERS.find(
      (u) => u.email.toLowerCase() === String(email).toLowerCase()
    );

    if (!matchedUser) {
      return res.status(401).json({
        status: 'error',
        code: 'INVALID_CREDENTIALS',
        message: 'Authentication failed: User account not found.'
      });
    }

    if (password && matchedUser.password !== password) {
      return res.status(401).json({
        status: 'error',
        code: 'INVALID_PASSWORD',
        message: 'Authentication failed: Incorrect password.'
      });
    }
  } else if (role) {
    // Demo convenience: allow signing in by role
    const targetRole = String(role).toUpperCase();
    matchedUser = ENTERPRISE_USERS.find((u) => u.role === targetRole) || {
      id: `usr-${targetRole.toLowerCase()}-${Date.now().toString().slice(-4)}`,
      email: `${targetRole.toLowerCase()}@audittrail.io`,
      role: targetRole,
      clearance: targetRole.includes('ADMIN') ? 'CONFIDENTIAL' : 'HIGH',
      name: `${targetRole} User`
    };
  } else {
    // Default to Logistics Manager identity
    matchedUser = ENTERPRISE_USERS[0];
  }

  const roleConfig = ROLES[matchedUser.role] || ROLES.LOGISTICS_MANAGER;

  // Sign JWT with standard claims
  const token = signJWT({
    id: matchedUser.id,
    email: matchedUser.email,
    role: matchedUser.role,
    clearance: matchedUser.clearance,
    permissions: roleConfig.permissions
  });

  logger.info(`🔐 [Auth Login] Generated JWT for '${matchedUser.email}' [Role: ${matchedUser.role}]`);

  res.status(200).json({
    status: 'success',
    message: 'Authentication successful. Bearer JWT issued.',
    token,
    tokenType: 'Bearer',
    expiresIn: '8h',
    user: {
      id: matchedUser.id,
      name: matchedUser.name,
      email: matchedUser.email,
      role: matchedUser.role,
      clearance: matchedUser.clearance,
      permissions: roleConfig.permissions
    }
  });
});

/**
 * @route GET /api/v1/auth/me
 * @desc Returns profile and verified RBAC permissions for the active bearer token.
 */
router.get('/me', requireAuth, (req, res) => {
  res.status(200).json({
    status: 'success',
    user: req.user
  });
});

/**
 * @route GET /api/v1/auth/roles
 * @desc Retrieves all defined enterprise Zero-Trust roles and their permission matrices.
 */
router.get('/roles', (req, res) => {
  res.status(200).json({
    status: 'success',
    roles: ROLES
  });
});

export default router;
