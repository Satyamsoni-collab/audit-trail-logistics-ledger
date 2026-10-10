/**
 * Simple Authentication & Tamper-Proofing Middleware
 * Secures write endpoints (Commands) from unauthorized access.
 */
export const requireAuth = (req, res, next) => {
  // In a real application, this would verify a JWT token.
  // For the Day 13 implementation, we look for a strict header requirement.
  
  const authHeader = req.headers['authorization'];
  const actorId = req.headers['x-user-id'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      status: 'error',
      code: 'UNAUTHORIZED',
      message: 'Access Denied: Missing or invalid Authorization token.'
    });
  }

  if (!actorId) {
    return res.status(400).json({
      status: 'error',
      code: 'MISSING_ACTOR_ID',
      message: 'Access Denied: x-user-id header is required for auditing purposes.'
    });
  }

  // Pass user identity down the request pipeline for Event Sourcing actor mapping
  req.user = { id: actorId };
  
  next();
};
