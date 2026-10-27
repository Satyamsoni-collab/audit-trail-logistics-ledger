import Redis from 'ioredis';
import logger from '../utils/logger.js';

/**
 * Enterprise Redis Client Wrapper with Graceful Fallback
 * 
 * Provides distributed caching with automatic fallback to in-memory caching
 * if Redis is temporarily unreachable or disabled.
 */
class CacheService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.inMemoryFallback = new Map(); // Fallback cache if Redis is down

    this.init();
  }

  init() {
    const redisHost = process.env.REDIS_HOST || 'localhost';
    const redisPort = process.env.REDIS_PORT || 6379;
    const redisPassword = process.env.REDIS_PASSWORD || undefined;

    // Skip connecting to Redis during Jest tests unless explicitly configured
    if (process.env.NODE_ENV === 'test' && !process.env.ENABLE_TEST_REDIS) {
      logger.info('🧪 [CacheService] Running in test mode. Using in-memory fallback cache.');
      return;
    }

    if (process.env.ENABLE_REDIS !== 'true' && !process.env.REDIS_HOST && !process.env.REDIS_URL) {
      logger.info('⚡ [CacheService] Redis not explicitly enabled (set ENABLE_REDIS=true to connect). Operating with in-memory cache.');
      this.isConnected = false;
      return;
    }

    try {
      this.client = new Redis({
        host: redisHost,
        port: Number(redisPort),
        password: redisPassword,
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        retryStrategy: (times) => {
          if (times > 3) {
            logger.warn('⚠️ [CacheService] Redis unreachable after 3 attempts. Switching to in-memory fallback.');
            return null; // Stop retrying and use in-memory
          }
          return Math.min(times * 100, 1000);
        }
      });

      this.client.connect().then(() => {
        this.isConnected = true;
        logger.info(`⚡ [CacheService] Connected to Redis distributed cache at ${redisHost}:${redisPort}`);
      }).catch((err) => {
        this.isConnected = false;
        logger.warn(`⚠️ [CacheService] Could not connect to Redis: ${err.message}. Operating in fallback mode.`);
      });

      this.client.on('error', (err) => {
        this.isConnected = false;
        logger.warn(`⚠️ [CacheService] Redis error: ${err.message}`);
      });

      this.client.on('ready', () => {
        this.isConnected = true;
      });

      this.client.on('close', () => {
        this.isConnected = false;
      });

    } catch (err) {
      this.isConnected = false;
      logger.warn(`⚠️ [CacheService] Initialization error: ${err.message}. Using fallback.`);
    }
  }

  /**
   * Retrieves an item from cache.
   * 
   * @param {String} key
   * @returns {Promise<Object|null>}
   */
  async get(key) {
    try {
      if (this.isConnected && this.client) {
        const cached = await this.client.get(key);
        if (cached) {
          return JSON.parse(cached);
        }
        return null;
      }

      // In-Memory Fallback
      const entry = this.inMemoryFallback.get(key);
      if (entry) {
        if (entry.expiresAt && Date.now() > entry.expiresAt) {
          this.inMemoryFallback.delete(key);
          return null;
        }
        return entry.data;
      }
      return null;
    } catch (err) {
      logger.warn(`[CacheService] Cache GET error for key ${key}: ${err.message}`);
      return null;
    }
  }

  /**
   * Stores an item in cache with a TTL.
   * 
   * @param {String} key
   * @param {Object} value
   * @param {Number} ttlSeconds - Default 300 (5 minutes)
   */
  async set(key, value, ttlSeconds = 300) {
    try {
      if (this.isConnected && this.client) {
        await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
        return;
      }

      // In-Memory Fallback
      this.inMemoryFallback.set(key, {
        data: value,
        expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null
      });
    } catch (err) {
      logger.warn(`[CacheService] Cache SET error for key ${key}: ${err.message}`);
    }
  }

  /**
   * Invalidates a specific key from cache.
   * 
   * @param {String} key
   */
  async del(key) {
    try {
      if (this.isConnected && this.client) {
        await this.client.del(key);
      }
      this.inMemoryFallback.delete(key);
      logger.info(`🧹 [CacheService] Invalidated cache key: ${key}`);
    } catch (err) {
      logger.warn(`[CacheService] Cache DEL error for key ${key}: ${err.message}`);
    }
  }

  /**
   * Clears all cached keys matching a pattern.
   * 
   * @param {String} pattern
   */
  async delPattern(pattern) {
    try {
      if (this.isConnected && this.client) {
        const keys = await this.client.keys(pattern);
        if (keys.length > 0) {
          await this.client.del(...keys);
          logger.info(`🧹 [CacheService] Invalidated ${keys.length} keys matching pattern: ${pattern}`);
        }
      }

      // Fallback pattern deletion
      const regex = new RegExp(`^${pattern.replace('*', '.*')}$`);
      for (const k of this.inMemoryFallback.keys()) {
        if (regex.test(k)) {
          this.inMemoryFallback.delete(k);
        }
      }
    } catch (err) {
      logger.warn(`[CacheService] Cache DEL pattern error for ${pattern}: ${err.message}`);
    }
  }

  /**
   * Closes the Redis connection gracefully.
   */
  async disconnect() {
    if (this.client && this.isConnected) {
      await this.client.quit();
    }
  }
}

export default new CacheService();
