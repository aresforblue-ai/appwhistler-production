// src/backend/premium/apiKeyManager.js
// API key management for premium users

const crypto = require('crypto');
const { createGraphQLError } = require('../utils/errorHandler');

/**
 * API Key Manager for Premium Features
 * Handles creation, validation, and rate limiting for API keys
 */
class APIKeyManager {
  constructor(pool) {
    this.pool = pool;
    
    // Rate limits by tier
    this.rateLimits = {
      free: {
        requestsPerHour: 100,
        requestsPerDay: 1000,
        requestsPerMonth: 10000
      },
      premium: {
        requestsPerHour: 1000,
        requestsPerDay: 20000,
        requestsPerMonth: 500000
      },
      enterprise: {
        requestsPerHour: 10000,
        requestsPerDay: 200000,
        requestsPerMonth: 5000000
      }
    };
  }

  /**
   * Generate a new API key for a user
   * @param {string} userId - User ID
   * @param {string} tier - Subscription tier (free, premium, enterprise)
   * @param {string} name - Descriptive name for the key
   * @returns {object} API key details
   */
  async generateAPIKey(userId, tier = 'free', name = 'Default Key') {
    // Generate secure random key
    const keyPrefix = tier === 'free' ? 'aw_free' : tier === 'premium' ? 'aw_prem' : 'aw_ent';
    const randomBytes = crypto.randomBytes(32).toString('hex');
    const apiKey = `${keyPrefix}_${randomBytes}`;
    
    // Hash the key for storage (never store plain text)
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

    try {
      const result = await this.pool.query(
        `INSERT INTO api_keys (user_id, key_hash, key_prefix, tier, name, created_at, last_used_at)
         VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, NULL)
         RETURNING id, key_prefix, tier, name, created_at`,
        [userId, keyHash, apiKey.substring(0, 12), tier, name]
      );

      logger.info(`✅ API key generated for user ${userId} (${tier})`);

      // Return the plain key only once (user must save it)
      return {
        apiKey: apiKey, // Only shown once!
        keyId: result.rows[0].id,
        keyPrefix: result.rows[0].key_prefix,
        tier: tier,
        name: name,
        createdAt: result.rows[0].created_at,
        limits: this.rateLimits[tier]
      };
    } catch (error) {
      logger.error('API key generation failed:', error);
      throw createGraphQLError('Failed to generate API key', 'INTERNAL_SERVER_ERROR');
    }
  }

  /**
   * Validate an API key and check rate limits
   * @param {string} apiKey - The API key to validate
   * @returns {object} User info and remaining quota
   */
  async validateAPIKey(apiKey) {
    if (!apiKey || typeof apiKey !== 'string') {
      throw createGraphQLError('API key is required', 'UNAUTHENTICATED');
    }

    // Hash the provided key
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

    try {
      // Find the key in database
      const result = await this.pool.query(
        `SELECT ak.*, u.id as user_id, u.username, u.email
         FROM api_keys ak
         JOIN users u ON ak.user_id = u.id
         WHERE ak.key_hash = $1 AND ak.is_active = true`,
        [keyHash]
      );

      if (result.rows.length === 0) {
        throw createGraphQLError('Invalid API key', 'UNAUTHENTICATED');
      }

      const keyData = result.rows[0];

      // Check if key is expired (premium keys expire after 1 year)
      if (keyData.expires_at && new Date(keyData.expires_at) < new Date()) {
        throw createGraphQLError('API key expired', 'UNAUTHENTICATED');
      }

      // Check rate limits
      const usage = await this.getUsageStats(keyData.id);
      const limits = this.rateLimits[keyData.tier];

      if (usage.hourly >= limits.requestsPerHour) {
        throw createGraphQLError('Hourly rate limit exceeded', 'RATE_LIMIT_EXCEEDED');
      }

      if (usage.daily >= limits.requestsPerDay) {
        throw createGraphQLError('Daily rate limit exceeded', 'RATE_LIMIT_EXCEEDED');
      }

      if (usage.monthly >= limits.requestsPerMonth) {
        throw createGraphQLError('Monthly rate limit exceeded', 'RATE_LIMIT_EXCEEDED');
      }

      // Update last used timestamp
      await this.pool.query(
        `UPDATE api_keys SET last_used_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [keyData.id]
      );

      // Record usage
      await this.recordUsage(keyData.id);

      return {
        userId: keyData.user_id,
        username: keyData.username,
        email: keyData.email,
        tier: keyData.tier,
        keyId: keyData.id,
        remainingQuota: {
          hourly: limits.requestsPerHour - usage.hourly,
          daily: limits.requestsPerDay - usage.daily,
          monthly: limits.requestsPerMonth - usage.monthly
        }
      };
    } catch (error) {
      if (error.extensions?.code) {
        throw error; // Re-throw GraphQL errors
      }
      logger.error('API key validation failed:', error);
      throw createGraphQLError('API key validation failed', 'INTERNAL_SERVER_ERROR');
    }
  }

  /**
   * Get usage statistics for an API key
   * @private
   */
  async getUsageStats(keyId) {
    const result = await this.pool.query(
      `SELECT 
         COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 hour') as hourly,
         COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 day') as daily,
         COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as monthly
       FROM api_key_usage
       WHERE api_key_id = $1`,
      [keyId]
    );

    return {
      hourly: parseInt(result.rows[0]?.hourly || 0),
      daily: parseInt(result.rows[0]?.daily || 0),
      monthly: parseInt(result.rows[0]?.monthly || 0)
    };
  }

  /**
   * Record API key usage
   * @private
   */
  async recordUsage(keyId) {
    await this.pool.query(
      `INSERT INTO api_key_usage (api_key_id, created_at)
       VALUES ($1, CURRENT_TIMESTAMP)`,
      [keyId]
    );
  }

  /**
   * Revoke an API key
   */
  async revokeAPIKey(userId, keyId) {
    const result = await this.pool.query(
      `UPDATE api_keys
       SET is_active = false, revoked_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [keyId, userId]
    );

    if (result.rows.length === 0) {
      throw createGraphQLError('API key not found', 'NOT_FOUND');
    }

    logger.info(`🔒 API key revoked: ${keyId}`);
    return true;
  }

  /**
   * List all API keys for a user
   */
  async listAPIKeys(userId) {
    const result = await this.pool.query(
      `SELECT id, key_prefix, tier, name, is_active, created_at, last_used_at, expires_at
       FROM api_keys
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    return result.rows;
  }

  /**
   * Get detailed usage analytics for a key
   */
  async getUsageAnalytics(userId, keyId, days = 30) {
    const result = await this.pool.query(
      `SELECT
         DATE(created_at) as date,
         COUNT(*) as requests
       FROM api_key_usage
       WHERE api_key_id = $1
         AND created_at > NOW() - INTERVAL '1 day' * $2
         AND api_key_id IN (SELECT id FROM api_keys WHERE user_id = $3)
       GROUP BY DATE(created_at)
       ORDER BY date DESC`,
      [keyId, days, userId]
    );

    return result.rows;
  }

  /**
   * Upgrade a user's API tier (when they subscribe to premium)
   */
  async upgradeAPITier(userId, newTier) {
    if (!['free', 'premium', 'enterprise'].includes(newTier)) {
      throw createGraphQLError('Invalid tier', 'BAD_USER_INPUT');
    }

    const result = await this.pool.query(
      `UPDATE api_keys
       SET tier = $1
       WHERE user_id = $2 AND is_active = true
       RETURNING id`,
      [newTier, userId]
    );

    logger.info(`⬆️  Upgraded ${result.rows.length} API keys to ${newTier} for user ${userId}`);
    return result.rows.length;
  }
}

module.exports = APIKeyManager;
