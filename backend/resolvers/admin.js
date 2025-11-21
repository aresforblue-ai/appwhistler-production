// Admin-only resolvers
const { createGraphQLError, withErrorHandling } = require('../utils/errorHandler');
const cacheManager = require('../utils/cacheManager');
const { requireRole } = require('./helpers');

module.exports = {
  Query: {
    // Admin: Get pending apps (unverified)
    pendingApps: async (_, { limit = 20, offset = 0 }, context) => {
      await requireRole(context, ['admin', 'moderator']);

      const result = await context.pool.query(
        `SELECT * FROM apps
         WHERE is_verified = false
         ORDER BY created_at ASC
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      );

      return {
        edges: result.rows,
        pageInfo: {
          hasNextPage: result.rows.length === limit,
          hasPreviousPage: offset > 0,
          startCursor: offset.toString(),
          endCursor: (offset + result.rows.length).toString()
        }
      };
    },

    // Admin: Get pending fact-checks (unverified)
    pendingFactChecks: async (_, { limit = 20, offset = 0 }, context) => {
      await requireRole(context, ['admin', 'moderator']);

      const result = await context.pool.query(
        `SELECT * FROM fact_checks
         WHERE verified_by IS NULL
         ORDER BY created_at ASC
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      );

      return {
        edges: result.rows,
        pageInfo: {
          hasNextPage: result.rows.length === limit,
          hasPreviousPage: offset > 0,
          startCursor: offset.toString(),
          endCursor: (offset + result.rows.length).toString()
        }
      };
    },

    // Admin: Get dashboard statistics
    adminStats: async (_, __, context) => {
      await requireRole(context, ['admin', 'moderator']);

      const stats = await context.pool.query(`
        SELECT
          (SELECT COUNT(*) FROM apps WHERE is_verified = false) as pending_apps_count,
          (SELECT COUNT(*) FROM fact_checks WHERE verified_by IS NULL) as pending_fact_checks_count,
          (SELECT COUNT(*) FROM users) as total_users,
          (SELECT COUNT(*) FROM apps WHERE is_verified = true) as total_verified_apps,
          (SELECT COUNT(*) FROM fact_checks WHERE verified_by IS NOT NULL) as total_verified_fact_checks
      `);

      const activity = await context.pool.query(
        `SELECT action, metadata, created_at, user_id
         FROM activity_log
         ORDER BY created_at DESC
         LIMIT 20`
      );

      return {
        pendingAppsCount: parseInt(stats.rows[0].pending_apps_count),
        pendingFactChecksCount: parseInt(stats.rows[0].pending_fact_checks_count),
        totalUsers: parseInt(stats.rows[0].total_users),
        totalVerifiedApps: parseInt(stats.rows[0].total_verified_apps),
        totalVerifiedFactChecks: parseInt(stats.rows[0].total_verified_fact_checks),
        recentActivity: activity.rows.map(row => ({
          action: row.action,
          timestamp: row.created_at,
          metadata: row.metadata
        }))
      };
    },

    // Admin: Cursor-based pagination for pending apps
    pendingAppsCursor: async (_, { after, before, first, last }, context) => {
      await requireRole(context, ['admin', 'moderator']);
      const { executePaginationQuery } = require('../utils/pagination');
      const { encodeCursor } = require('../utils/cursor');

      const query = 'SELECT * FROM apps WHERE is_verified = false';

      const { rows, hasNextPage, hasPreviousPage, startCursor, endCursor } =
        await executePaginationQuery({
          pool: context.pool,
          baseQuery: query,
          baseParams: [],
          afterCursor: after,
          beforeCursor: before,
          first,
          last,
          orderField: 'created_at',
          orderDirection: 'ASC',
          idField: 'id'
        });

      return {
        edges: rows.map(row => ({
          node: row,
          cursor: encodeCursor(row)
        })),
        pageInfo: {
          hasNextPage,
          hasPreviousPage,
          startCursor: startCursor ? encodeCursor(startCursor) : null,
          endCursor: endCursor ? encodeCursor(endCursor) : null
        },
        totalCount: null
      };
    },

    // Admin: Cursor-based pagination for pending fact-checks
    pendingFactChecksCursor: async (_, { after, before, first, last }, context) => {
      await requireRole(context, ['admin', 'moderator']);
      const { executePaginationQuery } = require('../utils/pagination');
      const { encodeCursor } = require('../utils/cursor');

      const query = 'SELECT * FROM fact_checks WHERE verified_by IS NULL';

      const { rows, hasNextPage, hasPreviousPage, startCursor, endCursor } =
        await executePaginationQuery({
          pool: context.pool,
          baseQuery: query,
          baseParams: [],
          afterCursor: after,
          beforeCursor: before,
          first,
          last,
          orderField: 'created_at',
          orderDirection: 'ASC',
          idField: 'id'
        });

      return {
        edges: rows.map(row => ({
          node: row,
          cursor: encodeCursor(row)
        })),
        pageInfo: {
          hasNextPage,
          hasPreviousPage,
          startCursor: startCursor ? encodeCursor(startCursor) : null,
          endCursor: endCursor ? encodeCursor(endCursor) : null
        },
        totalCount: null
      };
    },
  },

  Mutation: {
    // Admin: Verify an app
    verifyApp: withErrorHandling(async (_, { id }, context) => {
      const { userId } = await requireRole(context, ['admin', 'moderator']);

      const appCheck = await context.pool.query(
        'SELECT id, is_verified FROM apps WHERE id = $1',
        [id]
      );

      if (appCheck.rows.length === 0) {
        throw createGraphQLError('App not found', 'NOT_FOUND');
      }

      if (appCheck.rows[0].is_verified) {
        throw createGraphQLError('App is already verified', 'BAD_USER_INPUT');
      }

      const result = await context.pool.query(
        `UPDATE apps
         SET is_verified = true,
             verified_by = $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING *`,
        [userId, id]
      );

      await context.pool.query(
        `INSERT INTO activity_log (user_id, action, metadata)
         VALUES ($1, $2, $3)`,
        [userId, 'verify_app', JSON.stringify({ app_id: id })]
      );

      // Invalidate cache since trending apps may have changed
      await cacheManager.delete(cacheManager.constructor.generateKey('trending:apps', { limit: 10 }));

      console.log(`✅ App ${id} verified by user ${userId}`);
      return result.rows[0];
    }),

    // Admin: Reject an app
    rejectApp: async (_, { id, reason }, context) => {
      const { userId } = await requireRole(context, ['admin', 'moderator']);

      const result = await context.pool.query(
        'DELETE FROM apps WHERE id = $1 RETURNING *',
        [id]
      );

      if (result.rows.length === 0) {
        throw createGraphQLError('App not found', 'NOT_FOUND');
      }

      await context.pool.query(
        `INSERT INTO activity_log (user_id, action, metadata)
         VALUES ($1, $2, $3)`,
        [userId, 'reject_app', JSON.stringify({ app_id: id, reason: reason || 'No reason provided' })]
      );

      console.log(`❌ App ${id} rejected by user ${userId}: ${reason || 'No reason provided'}`);
      return true;
    },
  },
};
