// src/backend/utils/dataLoader.js
// Batch loading utility to prevent N+1 query problems in resolvers
// Uses a simple in-memory batching approach (for production, consider redis-based caching)

/**
 * Simple batch loader implementation
 * Groups multiple single-item queries into one batch query
 */
class BatchLoader {
  constructor(batchFn, options = {}) {
    this.batchFn = batchFn;
    this.queue = [];
    this.cache = new Map();
    this.maxBatchSize = options.maxBatchSize || 100;
    this.batchSchedule = null;
  }

  /**
   * Load a single item (queues it for batch processing)
   * @param {any} key - Item key to load
   * @returns {Promise}
   */
  load(key) {
    // Return cached result immediately
    if (this.cache.has(key)) {
      return Promise.resolve(this.cache.get(key));
    }

    // Create promise that will resolve when batch executes
    const promise = new Promise((resolve, reject) => {
      this.queue.push({ key, resolve, reject });

      // Flush batch if it reaches max size
      if (this.queue.length >= this.maxBatchSize) {
        this.flush();
      } else if (!this.batchSchedule) {
        // Schedule batch to flush at end of event loop
        this.batchSchedule = setImmediate(() => this.flush());
      }
    });

    return promise;
  }

  /**
   * Load multiple items at once
   * @param {array} keys - Array of keys to load
   * @returns {Promise<array>}
   */
  loadMany(keys) {
    return Promise.all(keys.map(key => this.load(key)));
  }

  /**
   * Execute batch query and resolve all pending promises
   * @private
   */
  async flush() {
    if (this.queue.length === 0) {
      this.batchSchedule = null;
      return;
    }

    const batch = this.queue.splice(0, this.maxBatchSize);
    const keys = batch.map(item => item.key);

    try {
      const results = await this.batchFn(keys);
      const resultMap = new Map();

      // Create map from results
      if (Array.isArray(results)) {
        results.forEach((result, idx) => {
          resultMap.set(keys[idx], result);
        });
      } else {
        // Results is already a map/object
        Object.entries(results).forEach(([key, result]) => {
          resultMap.set(key, result);
        });
      }

      // Resolve all promises
      batch.forEach(item => {
        const result = resultMap.get(item.key);
        this.cache.set(item.key, result);
        item.resolve(result);
      });

      // Continue flushing if more items queued
      if (this.queue.length > 0) {
        this.batchSchedule = setImmediate(() => this.flush());
      } else {
        this.batchSchedule = null;
      }
    } catch (error) {
      batch.forEach(item => {
        item.reject(error);
      });

      if (this.queue.length > 0) {
        this.batchSchedule = setImmediate(() => this.flush());
      } else {
        this.batchSchedule = null;
      }
    }
  }

  /**
   * Clear cache
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Warm cache with values
   * @param {Map|object} values
   */
  prime(values) {
    if (values instanceof Map) {
      values.forEach((value, key) => {
        this.cache.set(key, value);
      });
    } else {
      Object.entries(values).forEach(([key, value]) => {
        this.cache.set(key, value);
      });
    }
  }
}

/**
 * Create batch loaders for common queries
 * @param {Pool} pool - PostgreSQL pool
 * @returns {object} Batch loaders
 */
function createBatchLoaders(pool) {
  return {
    // Load users by ID
    userById: new BatchLoader(async (userIds) => {
      const result = await pool.query(
        `SELECT * FROM users WHERE id = ANY($1)`,
        [userIds]
      );
      
      const usersMap = new Map();
      result.rows.forEach(user => {
        usersMap.set(user.id, user);
      });
      
      return usersMap;
    }),

    // Load reviews by app ID
    reviewsByAppId: new BatchLoader(async (appIds) => {
      const result = await pool.query(
        `SELECT * FROM reviews WHERE app_id = ANY($1) ORDER BY created_at DESC`,
        [appIds]
      );
      
      const reviewsMap = new Map();
      appIds.forEach(appId => {
        reviewsMap.set(appId, []);
      });
      
      result.rows.forEach(review => {
        if (reviewsMap.has(review.app_id)) {
          reviewsMap.get(review.app_id).push(review);
        }
      });
      
      return reviewsMap;
    }),

    // Load fact checks by user ID
    factChecksByUserId: new BatchLoader(async (userIds) => {
      const result = await pool.query(
        `SELECT * FROM fact_checks WHERE submitted_by = ANY($1) ORDER BY created_at DESC`,
        [userIds]
      );
      
      const checksMap = new Map();
      userIds.forEach(userId => {
        checksMap.set(userId, []);
      });
      
      result.rows.forEach(check => {
        if (checksMap.has(check.submitted_by)) {
          checksMap.get(check.submitted_by).push(check);
        }
      });
      
      return checksMap;
    }),

    // Load average rating by app ID
    averageRatingByAppId: new BatchLoader(async (appIds) => {
      const result = await pool.query(
        `SELECT app_id, AVG(rating) as avg_rating FROM reviews 
         WHERE app_id = ANY($1) 
         GROUP BY app_id`,
        [appIds]
      );
      
      const ratingsMap = new Map();
      appIds.forEach(appId => {
        ratingsMap.set(appId, 0);
      });
      
      result.rows.forEach(row => {
        ratingsMap.set(row.app_id, parseFloat(row.avg_rating) || 0);
      });
      
      return ratingsMap;
    }),

    // Load app by ID
    appById: new BatchLoader(async (appIds) => {
      const result = await pool.query(
        `SELECT * FROM apps WHERE id = ANY($1)`,
        [appIds]
      );
      
      const appsMap = new Map();
      result.rows.forEach(app => {
        appsMap.set(app.id, app);
      });
      
      return appsMap;
    }),

    // Load bounty by ID
    bountyById: new BatchLoader(async (bountyIds) => {
      const result = await pool.query(
        `SELECT * FROM bounties WHERE id = ANY($1)`,
        [bountyIds]
      );
      
      const bountiesMap = new Map();
      result.rows.forEach(bounty => {
        bountiesMap.set(bounty.id, bounty);
      });
      
      return bountiesMap;
    }),
  };
}

module.exports = {
  BatchLoader,
  createBatchLoaders
};
