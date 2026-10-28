import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import cacheService from '../../config/redis.js';
import logger from '../../utils/logger.js';

/**
 * Creates a rate limiter with Redis store and automatic in-memory fallback.
 * 
 * @param {Object} options 
 * @param {Number} options.windowMs - Time window in milliseconds
 * @param {Number} options.max - Maximum requests allowed per window
 * @param {String} options.message - User-facing error message
 * @param {String} options.limiterName - Telemetry identifier
 */
function createDistributedLimiter({ windowMs, max, message, limiterName }) {
  let store = undefined;

  // Use RedisStore only if Redis client is actively connected and not in test environment
  if (cacheService.isConnected && cacheService.client && process.env.NODE_ENV !== 'test') {
    try {
      store = new RedisStore({
        // Pass sendCommand function from ioredis client
        sendCommand: (...args) => cacheService.client.call(...args),
        prefix: `rl:${limiterName}:`
      });
      logger.info(`⚡ [RateLimiter] Configured Redis-backed rate limiter for '${limiterName}'`);
    } catch (err) {
      logger.warn(`⚠️ [RateLimiter] Could not attach Redis store for '${limiterName}'. Using in-memory fallback.`);
    }
  }

  return rateLimit({
    windowMs,
    max,
    standardHeaders: true, // Return standard RateLimit-* headers (RFC draft)
    legacyHeaders: false,  // Disable X-RateLimit-* legacy headers
    store,
    handler: (req, res) => {
      logger.warn(`🚨 [RateLimit Exceeded] '${limiterName}' threshold triggered by IP: ${req.ip} on ${req.originalUrl}`);
      res.status(429).json({
        status: 'error',
        code: 'TOO_MANY_REQUESTS',
        message: message || 'Too many requests. Please slow down and try again later.',
        retryAfterSeconds: Math.ceil(windowMs / 1000)
      });
    }
  });
}

/**
 * Tier 1: CQRS Command Write Limiter
 * Protects Event Store and immutable ledger from DDoS and flood attacks.
 */
export const commandRateLimiter = createDistributedLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 30,             // 30 write commands per minute
  message: 'CQRS command write limit exceeded. Rate limited to protect ledger integrity from event store flooding.',
  limiterName: 'cqrs_command'
});

/**
 * Tier 2: Read-Model Query Limiter
 * Protects CQRS read projections and queries.
 */
export const queryRateLimiter = createDistributedLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 120,            // 120 queries per minute
  message: 'Query read threshold exceeded. Please throttle read-model requests.',
  limiterName: 'cqrs_query'
});

/**
 * Tier 3: Strict Authentication Brute-Force Limiter
 * Protects login and token issuance endpoints from credential stuffing.
 */
export const authRateLimiter = createDistributedLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15,                  // 15 login attempts per 15 mins
  message: 'Too many authentication attempts from this IP. Please try again after 15 minutes.',
  limiterName: 'auth_login'
});

export default {
  commandRateLimiter,
  queryRateLimiter,
  authRateLimiter
};
