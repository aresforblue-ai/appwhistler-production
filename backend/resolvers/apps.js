// App-related resolvers
const cacheManager = require('../utils/cacheManager');
const { getField } = require('./helpers');
const { withErrorHandling } = require('../utils/errorHandler');

module.exports = {
  Query: {
    // Get all apps with filters (cached for non-search queries)
    apps: withErrorHandling(async (_, { category, platform, search, minTruthRating, limit = 20, offset = 0 }, context) => {
      // Don't cache search queries (they're typically user-initiated)
      // Only cache filtered/sorted queries
      if (!search && offset === 0) {
        const cacheKey = cacheManager.constructor.generateKey('apps:filtered', {
          category, platform, minTruthRating, limit
        });

        const cached = await cacheManager.get(cacheKey);
        if (cached) return cached;
      }

      let query = 'SELECT * FROM apps WHERE 1=1';
      const params = [];
      let paramCount = 1;

      if (category) {
        query += ` AND category = $${paramCount++}`;
        params.push(category);
      }

      if (platform) {
        query += ` AND platform = $${paramCount++}`;
        params.push(platform);
      }

      if (search) {
        const normalizedSearch = search.trim();
        // SECURITY FIX: Escape ILIKE special characters (%, _) to prevent pattern injection
        const escapedSearch = normalizedSearch.replace(/[_%\\]/g, '\\$&').replace(/\s+/g, '%');
        const likePattern = `%${escapedSearch}%`;
        query += ` AND (name ILIKE $${paramCount} OR description ILIKE $${paramCount + 1} OR developer ILIKE $${paramCount + 2})`;
        params.push(likePattern, likePattern, likePattern);
        paramCount += 3;
      }

      if (minTruthRating) {
        query += ` AND truth_rating >= $${paramCount++}`;
        params.push(minTruthRating);
      }

      // Order by relevance if searching, otherwise by truth_rating
      if (search) {
        query += ` ORDER BY download_count DESC, truth_rating DESC`;
      } else {
        query += ` ORDER BY truth_rating DESC`;
      }

      query += ` LIMIT $${paramCount++} OFFSET $${paramCount++}`;
      params.push(limit, offset);

      const result = await context.pool.query(query, params);

      const response = {
        edges: result.rows,
        pageInfo: {
          hasNextPage: result.rows.length === limit,
          hasPreviousPage: offset > 0,
          startCursor: offset.toString(),
          endCursor: (offset + result.rows.length).toString()
        }
      };

      // Cache non-search queries
      if (!search && offset === 0) {
        const cacheKey = cacheManager.constructor.generateKey('apps:filtered', {
          category, platform, minTruthRating, limit
        });
        await cacheManager.set(cacheKey, response, 600); // Cache for 10 minutes
      }

      return response;
    }),

    // Get single app by ID
    app: withErrorHandling(async (_, { id }, context) => {
      // Use DataLoader to batch app queries and prevent N+1 issues
      return context.loaders.appById.load(id);
    }),

    // Get trending apps (cached)
    trendingApps: async (_, { limit = 10 }, context) => {
      const cacheKey = cacheManager.constructor.generateKey('trending:apps', { limit });

      return cacheManager.getOrSet(cacheKey, async () => {
        const result = await context.pool.query(
          `SELECT * FROM apps
           WHERE is_verified = true
           ORDER BY download_count DESC
           LIMIT $1`,
          [limit]
        );
        return result.rows;
      }, 300); // Cache for 5 minutes
    },

    // Get AI recommendations for user
    recommendedApps: async (_, { userId }, context) => {
      const result = await context.pool.query(
        `SELECT r.*, a.*
         FROM recommendations r
         JOIN apps a ON r.app_id = a.id
         WHERE r.user_id = $1
         ORDER BY r.score DESC
         LIMIT 20`,
        [userId]
      );
      return result.rows;
    },

    // Cursor-based pagination for apps
    appsCursor: async (_, { after, before, first, last, category, platform, search, minTruthRating }, context) => {
      const { encodeCursor } = require('../utils/cursor');

      // Build base query with filters
      let query = 'SELECT * FROM apps WHERE 1=1';
      const params = [];
      let paramCount = 1;

      if (category) {
        query += ` AND category = $${paramCount++}`;
        params.push(category);
      }

      if (platform) {
        query += ` AND platform = $${paramCount++}`;
        params.push(platform);
      }

      if (search) {
        // Use full-text search with tsvector
        const tsQuery = search.trim().split(/\s+/).join(' & ');
        query += ` AND search_vector @@ to_tsquery('english', $${paramCount})`;
        params.push(tsQuery);
        paramCount++;
      }

      if (minTruthRating !== null && minTruthRating !== undefined) {
        query += ` AND truth_rating >= $${paramCount++}`;
        params.push(minTruthRating);
      }

      // For cursor pagination with search, we can't use the pagination utility
      // because search needs to order by ts_rank, not created_at
      // So we'll implement a simpler version here
      const limit = (first || last || 20);

      // Order by relevance if searching, otherwise by created_at
      if (search) {
        const tsQuery = search.trim().split(/\s+/).join(' & ');
        query += ` ORDER BY ts_rank(search_vector, to_tsquery('english', $${paramCount})) DESC, created_at DESC`;
        params.push(tsQuery);
        paramCount++;
      } else {
        query += ` ORDER BY created_at DESC`;
      }

      query += ` LIMIT $${paramCount}`;
      params.push(limit + 1); // Fetch one extra to check hasNextPage
      paramCount++;

      const result = await context.pool.query(query, params);
      const rows = result.rows;

      const hasMore = rows.length > limit;
      const finalRows = hasMore ? rows.slice(0, limit) : rows;

      return {
        edges: finalRows.map(row => ({
          node: row,
          cursor: encodeCursor(row)
        })),
        pageInfo: {
          hasNextPage: hasMore,
          hasPreviousPage: !!after,
          startCursor: finalRows.length > 0 ? encodeCursor(finalRows[0]) : null,
          endCursor: finalRows.length > 0 ? encodeCursor(finalRows[finalRows.length - 1]) : null
        },
        totalCount: null
      };
    },
  },

  Mutation: {
    // No app mutations in this file (they're in admin.js)
  },

  // Nested resolvers for App type
  App: {
    downloadCount: parent => getField(parent, 'download_count', Number),
    truthRating: parent => getField(parent, 'truth_rating', Number),
    reviews: async (parent, _, context) => {
      if (context.loaders) {
        return context.loaders.reviewsByAppId.load(parent.id);
      }
      // Fallback if loaders not initialized
      const result = await context.pool.query(
        'SELECT * FROM reviews WHERE app_id = $1 ORDER BY created_at DESC LIMIT 100',
        [parent.id]
      );
      return result.rows;
    },
    averageRating: async (parent, _, context) => {
      const cached = getField(parent, 'average_rating', Number);
      if (cached !== null) {
        return cached;
      }

      if (context.loaders) {
        return context.loaders.averageRatingByAppId.load(parent.id);
      }
      // Fallback
      const result = await context.pool.query(
        'SELECT AVG(rating) as avg FROM reviews WHERE app_id = $1',
        [parent.id]
      );
      return parseFloat(result.rows[0]?.avg) || 0;
    },
    verifiedBy: async (parent, _, context) => {
      const verifierId = getField(parent, 'verified_by');
      if (!verifierId) return null;

      // Use DataLoader to batch user queries and prevent N+1 issues
      return context.loaders.userById.load(verifierId);
    },
  },
};
