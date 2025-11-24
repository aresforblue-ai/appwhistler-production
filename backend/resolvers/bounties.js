// Bounty-related resolvers
const { sanitizePlainText } = require('../utils/sanitizer');
const { requireAuth } = require('./helpers');
const { createGraphQLError } = require('../utils/errorHandler');
const logger = require('../utils/logger');

module.exports = {
  Query: {
    // Get bounties
    bounties: async (_, { status }, context) => {
      let query = 'SELECT * FROM bounties';
      const params = [];

      if (status) {
        query += ' WHERE status = $1';
        params.push(status);
      }

      query += ' ORDER BY created_at DESC';

      let result;
      try {
        result = await context.pool.query(query, params);
      } catch (error) {
        logger.error('[bounties] Database query failed:', error);
        throw createGraphQLError('Failed to fetch bounties', 'DATABASE_ERROR');
      }
      return result.rows;
    },
  },

  Mutation: {
    // Create bounty
    createBounty: async (_, { claim, rewardAmount }, context) => {
      const { userId } = requireAuth(context);

      const sanitizedClaim = sanitizePlainText(claim);

      const result = await context.pool.query(
        `INSERT INTO bounties (claim, reward_amount, creator_id)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [sanitizedClaim, rewardAmount, userId]
      );

      return result.rows[0];
    },
  },
};
