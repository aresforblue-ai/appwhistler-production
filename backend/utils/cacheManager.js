// src/backend/utils/cacheManager.js
// Redis-backed cache with in-memory fallback for query results

const { getSecret } = require('../../config/secrets');

class CacheManager {
  constructor() {
    this.inMemoryCache = new Map();
    this.redis = null;
    this.redisEnabled = false;
    this.initializeRedis();
  }

  /**
   * Initialize Redis connection (optional, falls back to in-memory)
   */
  initializeRedis() {
    const redisUrl = getSecret('REDIS_URL');
    
    if (!redisUrl) {
      logger.info('⚠️  Redis not configured. Using in-memory cache (dev/test mode).');
      return;
    }

    try {
      const redis = require('redis');
      this.redis = redis.createClient({
        url: redisUrl,
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              logger.error('❌ Redis reconnection failed after 10 attempts');
              return new Error('Redis max retries exceeded');
            }
            return retries * 50;
          }
        }
      });

      this.redis.on('error', (err) => logger.error('Redis error:', err));
      this.redis.on('connect', () => {
        logger.info('✅ Redis connected');
        this.redisEnabled = true;
      });

      this.redis.connect();
    } catch (error) {
      logger.warn('⚠️  Redis initialization failed, using in-memory cache:', error.message);
      this.redis = null;
    }
  }

  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {Promise<any>} Cached value or null
   */
  async get(key) {
    if (!key) return null;

    try {
      if (this.redisEnabled && this.redis) {
        const value = await this.redis.get(key);
        if (value) {
          logger.info(`📦 Cache HIT (Redis): ${key}`);
          return JSON.parse(value);
        }
      } else if (this.inMemoryCache.has(key)) {
        const cached = this.inMemoryCache.get(key);
        // Check if expired
        if (cached.expiresAt && new Date() > cached.expiresAt) {
          this.inMemoryCache.delete(key);
          return null;
        }
        logger.info(`📦 Cache HIT (Memory): ${key}`);
        return cached.value;
      }

      logger.info(`❌ Cache MISS: ${key}`);
      return null;
    } catch (error) {
      logger.warn(`Cache get error for ${key}:`, error.message);
      return null;
    }
  }

  /**
   * Set value in cache
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttlSeconds - Time to live in seconds (default: 1 hour)
   */
  async set(key, value, ttlSeconds = 3600) {
    if (!key || value === undefined) return;

    try {
      if (this.redisEnabled && this.redis) {
        await this.redis.setEx(key, ttlSeconds, JSON.stringify(value));
        logger.info(`💾 Cache SET (Redis): ${key} (TTL: ${ttlSeconds}s)`);
      } else {
        const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
        this.inMemoryCache.set(key, { value, expiresAt });
        logger.info(`💾 Cache SET (Memory): ${key} (TTL: ${ttlSeconds}s)`);
      }
    } catch (error) {
      logger.warn(`Cache set error for ${key}:`, error.message);
    }
  }

  /**
   * Delete cache key
   * @param {string} key - Cache key to delete
   */
  async delete(key) {
    try {
      if (this.redisEnabled && this.redis) {
        await this.redis.del(key);
      } else {
        this.inMemoryCache.delete(key);
      }
      logger.info(`🗑️  Cache DELETED: ${key}`);
    } catch (error) {
      logger.warn(`Cache delete error for ${key}:`, error.message);
    }
  }

  /**
   * Clear all cache
   */
  async clear() {
    try {
      if (this.redisEnabled && this.redis) {
        await this.redis.flushDb();
      } else {
        this.inMemoryCache.clear();
      }
      logger.info('🗑️  Cache CLEARED');
    } catch (error) {
      logger.warn('Cache clear error:', error.message);
    }
  }

  /**
   * Generate cache key for common queries
   */
  static generateKey(prefix, params) {
    const paramStr = JSON.stringify(params);
    return `${prefix}:${Buffer.from(paramStr).toString('base64')}`;
  }

  /**
   * Cache wrapper for async functions
   * @param {string} key - Cache key
   * @param {function} fetchFn - Async function that fetches the data
   * @param {number} ttl - TTL in seconds
   * @returns {Promise<any>} Cached or fresh data
   */
  async getOrSet(key, fetchFn, ttl = 3600) {
    // Try to get from cache
    const cached = await this.get(key);
    if (cached !== null) {
      return cached;
    }

    // Fetch fresh data
    const fresh = await fetchFn();

    // Cache it
    if (fresh !== null && fresh !== undefined) {
      await this.set(key, fresh, ttl);
    }

    return fresh;
  }

  /**
   * Close Redis connection gracefully
   */
  async disconnect() {
    if (this.redisEnabled && this.redis) {
      await this.redis.quit();
      logger.info('✅ Redis disconnected');
    }
  }
}

// Singleton instance
const cacheManager = new CacheManager();

module.exports = cacheManager;
