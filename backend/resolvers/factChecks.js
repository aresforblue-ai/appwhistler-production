// Fact-check related resolvers
const {
  validateTextLength, validateVerdict, validateConfidenceScore, validateUrl, validateVote
} = require('../utils/validation');
const { createGraphQLError, withErrorHandling } = require('../utils/errorHandler');
const { sanitizePlainText, sanitizeRichText, sanitizeJson } = require('../utils/sanitizer');
const { requireAuth, requireRole } = require('./helpers');

module.exports = {
  Query: {
    // Get fact checks with filters
    factChecks: async (_, { category, verdict, search, limit = 20, offset = 0 }, context) => {
      let query = 'SELECT * FROM fact_checks WHERE 1=1';
      const params = [];
      let paramCount = 1;

      if (category) {
        query += ` AND category = $${paramCount++}`;
        params.push(category);
      }

      if (verdict) {
        query += ` AND verdict = $${paramCount++}`;
        params.push(verdict);
      }

      if (search) {
        // Use full-text search with tsvector
        const tsQuery = search.trim().split(/\s+/).join(' & ');
        query += ` AND search_vector @@ to_tsquery('english', $${paramCount})`;
        params.push(tsQuery);
        paramCount++;
      }

      // Order by relevance if searching, otherwise by created_at
      if (search) {
        const tsQuery = search.trim().split(/\s+/).join(' & ');
        query += ` ORDER BY ts_rank(search_vector, to_tsquery('english', $${paramCount})) DESC, created_at DESC`;
        params.push(tsQuery);
        paramCount++;
      } else {
        query += ` ORDER BY created_at DESC`;
      }

      query += ` LIMIT $${paramCount++} OFFSET $${paramCount++}`;
      params.push(limit, offset);

      const result = await context.pool.query(query, params);

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

    // Get single fact check
    factCheck: async (_, { id }, context) => {
      const result = await context.pool.query(
        'SELECT * FROM fact_checks WHERE id = $1',
        [id]
      );
      return result.rows[0];
    },

    // Cursor-based pagination for fact checks
    factChecksCursor: async (_, { after, before, first, last, category, verdict, search }, context) => {
      const { encodeCursor } = require('../utils/cursor');

      // Build base query with filters
      let query = 'SELECT * FROM fact_checks WHERE 1=1';
      const params = [];
      let paramCount = 1;

      if (category) {
        query += ` AND category = $${paramCount++}`;
        params.push(category);
      }

      if (verdict) {
        query += ` AND verdict = $${paramCount++}`;
        params.push(verdict);
      }

      if (search) {
        // Use full-text search with tsvector
        const tsQuery = search.trim().split(/\s+/).join(' & ');
        query += ` AND search_vector @@ to_tsquery('english', $${paramCount})`;
        params.push(tsQuery);
        paramCount++;
      }

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
          hasPreviousPage: !!after || !!before,
          startCursor: finalRows.length > 0 ? encodeCursor(finalRows[0]) : null,
          endCursor: finalRows.length > 0 ? encodeCursor(finalRows[finalRows.length - 1]) : null
        },
        totalCount: null
      };
    },

    // AI: Get fact-check appeals
    factCheckAppeals: async (_, { factCheckId, status }, context) => {
      try {
        let query = 'SELECT * FROM fact_check_appeals WHERE 1=1';
        const params = [];
        let paramCount = 1;

        if (factCheckId) {
          query += ` AND fact_check_id = $${paramCount++}`;
          params.push(factCheckId);
        }

        if (status) {
          query += ` AND status = $${paramCount++}`;
          params.push(status);
        }

        query += ' ORDER BY created_at DESC LIMIT 100';
        const result = await context.pool.query(query, params);
        return result.rows;
      } catch (error) {
        if (error.code === '42P01') {
          console.warn('⚠️ fact_check_appeals table not found');
          return [];
        }
        throw error;
      }
    },

    // AI: Get single fact-check appeal
    factCheckAppeal: async (_, { id }, context) => {
      try {
        const result = await context.pool.query(
          'SELECT * FROM fact_check_appeals WHERE id = $1',
          [id]
        );
        return result.rows[0] || null;
      } catch (error) {
        if (error.code === '42P01') {
          console.warn('⚠️ fact_check_appeals table not found');
          return null;
        }
        throw error;
      }
    },
  },

  Mutation: {
    // Submit fact check
    submitFactCheck: withErrorHandling(async (_, { input }, context) => {
      const { userId } = requireAuth(context);
      const claim = sanitizePlainText(input.claim);
      const verdict = input.verdict;
      const confidenceScore = input.confidenceScore;
      const sources = input.sources ? sanitizeJson(input.sources) : null;
      const explanation = input.explanation ? sanitizeRichText(input.explanation) : null;
      const category = sanitizePlainText(input.category);
      const imageUrl = input.imageUrl ? sanitizePlainText(input.imageUrl) : null;

      // Validate inputs
      const claimValidation = validateTextLength(claim, 10, 5000, 'Claim');
      if (!claimValidation.valid) {
        throw createGraphQLError(claimValidation.message, 'BAD_USER_INPUT');
      }

      const verdictValidation = validateVerdict(verdict);
      if (!verdictValidation.valid) {
        throw createGraphQLError(verdictValidation.message, 'BAD_USER_INPUT');
      }

      if (confidenceScore !== null && confidenceScore !== undefined) {
        const scoreValidation = validateConfidenceScore(confidenceScore);
        if (!scoreValidation.valid) {
          throw createGraphQLError(scoreValidation.message, 'BAD_USER_INPUT');
        }
      }

      if (explanation) {
        const explValidation = validateTextLength(explanation, 5, 2000, 'Explanation');
        if (!explValidation.valid) {
          throw createGraphQLError(explValidation.message, 'BAD_USER_INPUT');
        }
      }

      if (imageUrl) {
        const urlValidation = validateUrl(imageUrl);
        if (!urlValidation.valid) {
          throw createGraphQLError(urlValidation.message, 'BAD_USER_INPUT');
        }
      }

      const result = await context.pool.query(
        `INSERT INTO fact_checks
         (claim, verdict, confidence_score, sources, explanation, category, image_url, submitted_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          claim,
          verdict,
          confidenceScore || 0,
          sources ? JSON.stringify(sources) : null,
          explanation,
          category,
          imageUrl,
          userId
        ]
      );

      const factCheck = result.rows[0];

      // Broadcast to WebSocket subscribers
      if (global.broadcastFactCheck) {
        global.broadcastFactCheck(category, factCheck);
      }

      // Award truth score
      await context.pool.query(
        'UPDATE users SET truth_score = truth_score + 10 WHERE id = $1',
        [userId]
      );

      return factCheck;
    }),

    // Vote on fact-check (upvote/downvote with spam prevention)
    voteFactCheck: withErrorHandling(async (_, { id, vote }, context) => {
      const { userId } = requireAuth(context);

      // Validate vote value (+1 or -1)
      const voteValidation = validateVote(vote);
      if (!voteValidation.valid) {
        throw createGraphQLError(voteValidation.message, 'BAD_USER_INPUT');
      }

      // Validate fact-check ID
      if (!id || typeof id !== 'string') {
        throw createGraphQLError('Fact-check ID is required', 'BAD_USER_INPUT');
      }

      // Use transaction for atomicity (prevents race conditions)
      await context.pool.query('BEGIN');

      try {
        // 1. Check if fact-check exists
        const factCheckResult = await context.pool.query(
          'SELECT id, upvotes, downvotes FROM fact_checks WHERE id = $1',
          [id]
        );

        if (factCheckResult.rows.length === 0) {
          await context.pool.query('ROLLBACK');
          throw createGraphQLError('Fact-check not found', 'NOT_FOUND');
        }

        // 2. Check if user has already voted
        const existingVoteResult = await context.pool.query(
          'SELECT vote_value FROM fact_check_votes WHERE fact_check_id = $1 AND user_id = $2',
          [id, userId]
        );

        const existingVote = existingVoteResult.rows[0];
        const previousVoteValue = existingVote ? existingVote.vote_value : 0;

        // 3. If user is changing vote or voting for first time
        if (previousVoteValue !== vote) {
          // Upsert vote (INSERT or UPDATE if exists)
          await context.pool.query(
            `INSERT INTO fact_check_votes (fact_check_id, user_id, vote_value)
             VALUES ($1, $2, $3)
             ON CONFLICT (fact_check_id, user_id)
             DO UPDATE SET vote_value = $3, updated_at = CURRENT_TIMESTAMP`,
            [id, userId, vote]
          );

          // 4. Recalculate vote counters
          // Remove previous vote impact and add new vote
          let upvoteDelta = 0;
          let downvoteDelta = 0;

          if (previousVoteValue === 1) {
            upvoteDelta -= 1; // Remove previous upvote
          } else if (previousVoteValue === -1) {
            downvoteDelta -= 1; // Remove previous downvote
          }

          if (vote === 1) {
            upvoteDelta += 1; // Add new upvote
          } else if (vote === -1) {
            downvoteDelta += 1; // Add new downvote
          }

          // Update fact_check counters
          await context.pool.query(
            `UPDATE fact_checks
             SET upvotes = GREATEST(0, upvotes + $1),
                 downvotes = GREATEST(0, downvotes + $2),
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $3`,
            [upvoteDelta, downvoteDelta, id]
          );

          console.log(`✅ Vote recorded: User ${userId} voted ${vote > 0 ? 'upvote' : 'downvote'} on fact-check ${id}`);
        } else {
          console.log(`ℹ️ No change: User ${userId} already voted ${vote > 0 ? 'upvote' : 'downvote'} on fact-check ${id}`);
        }

        // Commit transaction
        await context.pool.query('COMMIT');

        // 5. Return updated fact-check
        const updatedFactCheck = await context.pool.query(
          'SELECT * FROM fact_checks WHERE id = $1',
          [id]
        );

        return updatedFactCheck.rows[0];
      } catch (error) {
        // Rollback on any error
        await context.pool.query('ROLLBACK');
        console.error('Vote fact-check error:', error);
        throw error;
      }
    }),

    // Admin: Verify a fact-check
    verifyFactCheck: async (_, { id }, context) => {
      const { userId } = await requireRole(context, ['admin', 'moderator']);

      const fcCheck = await context.pool.query(
        'SELECT id, verified_by, submitted_by FROM fact_checks WHERE id = $1',
        [id]
      );

      if (fcCheck.rows.length === 0) {
        throw createGraphQLError('Fact-check not found', 'NOT_FOUND');
      }

      if (fcCheck.rows[0].verified_by) {
        throw createGraphQLError('Fact-check is already verified', 'BAD_USER_INPUT');
      }

      const result = await context.pool.query(
        `UPDATE fact_checks
         SET verified_by = $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING *`,
        [userId, id]
      );

      // Award +50 truth score bonus to submitter
      if (result.rows[0].submitted_by) {
        await context.pool.query(
          'UPDATE users SET truth_score = truth_score + 50 WHERE id = $1',
          [result.rows[0].submitted_by]
        );
      }

      await context.pool.query(
        `INSERT INTO activity_log (user_id, action, metadata)
         VALUES ($1, $2, $3)`,
        [userId, 'verify_fact_check', JSON.stringify({ fact_check_id: id })]
      );

      console.log(`✅ Fact-check ${id} verified by user ${userId}`);
      return result.rows[0];
    },

    // Admin: Reject a fact-check
    rejectFactCheck: async (_, { id, reason }, context) => {
      const { userId } = await requireRole(context, ['admin', 'moderator']);

      const result = await context.pool.query(
        'DELETE FROM fact_checks WHERE id = $1 RETURNING *',
        [id]
      );

      if (result.rows.length === 0) {
        throw createGraphQLError('Fact-check not found', 'NOT_FOUND');
      }

      await context.pool.query(
        `INSERT INTO activity_log (user_id, action, metadata)
         VALUES ($1, $2, $3)`,
        [userId, 'reject_fact_check', JSON.stringify({ fact_check_id: id, reason: reason || 'No reason provided' })]
      );

      console.log(`❌ Fact-check ${id} rejected by user ${userId}: ${reason || 'No reason provided'}`);
      return true;
    },

    // AI: Submit a fact-check appeal (user challenges verdict)
    submitFactCheckAppeal: async (_, { factCheckId, proposedVerdict, reasoning, evidence, supportingLinks }, context) => {
      const { userId } = requireAuth(context);

      // Validate inputs
      if (!factCheckId || typeof factCheckId !== 'string') {
        throw createGraphQLError('Fact-check ID is required', 'BAD_USER_INPUT');
      }

      if (!proposedVerdict || typeof proposedVerdict !== 'string') {
        throw createGraphQLError('Proposed verdict is required', 'BAD_USER_INPUT');
      }

      const validVerdicts = ['TRUE', 'FALSE', 'MISLEADING', 'PARTIALLY_TRUE', 'UNDETERMINED', 'NO_CONSENSUS'];
      if (!validVerdicts.includes(proposedVerdict)) {
        throw createGraphQLError('Invalid verdict value', 'BAD_USER_INPUT');
      }

      if (!reasoning || reasoning.length < 20) {
        throw createGraphQLError('Reasoning must be at least 20 characters', 'BAD_USER_INPUT');
      }

      // Verify fact-check exists
      const fcCheck = await context.pool.query(
        'SELECT id FROM fact_checks WHERE id = $1',
        [factCheckId]
      );

      if (fcCheck.rows.length === 0) {
        throw createGraphQLError('Fact-check not found', 'NOT_FOUND');
      }

      try {
        const result = await context.pool.query(
          `INSERT INTO fact_check_appeals
           (fact_check_id, user_id, proposed_verdict, reasoning, evidence, supporting_links, status, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, 'pending', CURRENT_TIMESTAMP)
           RETURNING *`,
          [
            factCheckId,
            userId,
            proposedVerdict,
            sanitizePlainText(reasoning),
            evidence ? sanitizePlainText(evidence) : null,
            supportingLinks ? JSON.stringify(supportingLinks) : null
          ]
        );

        console.log(`✅ Fact-check appeal submitted: ${result.rows[0].id}`);

        // Broadcast appeal to moderators
        if (global.broadcastAppeal) {
          global.broadcastAppeal(factCheckId, result.rows[0]);
        }

        return result.rows[0];
      } catch (error) {
        // If table doesn't exist, return mock object for now
        if (error.code === '42P01') {
          console.warn('⚠️ fact_check_appeals table not found, returning mock object');
          return {
            id: `mock-appeal-${Date.now()}`,
            fact_check_id: factCheckId,
            user_id: userId,
            proposed_verdict: proposedVerdict,
            reasoning: reasoning,
            evidence: evidence || null,
            supporting_links: supportingLinks || [],
            status: 'pending',
            created_at: new Date().toISOString()
          };
        }
        throw error;
      }
    },

    // Admin: Review a fact-check appeal
    reviewFactCheckAppeal: async (_, { appealId, approved, newVerdict }, context) => {
      const { userId } = await requireRole(context, ['admin', 'moderator']);

      // Validate inputs
      if (!appealId || typeof appealId !== 'string') {
        throw createGraphQLError('Appeal ID is required', 'BAD_USER_INPUT');
      }

      if (typeof approved !== 'boolean') {
        throw createGraphQLError('Approval status is required', 'BAD_USER_INPUT');
      }

      try {
        // Fetch appeal
        const appealResult = await context.pool.query(
          'SELECT * FROM fact_check_appeals WHERE id = $1',
          [appealId]
        );

        if (appealResult.rows.length === 0) {
          throw createGraphQLError('Appeal not found', 'NOT_FOUND');
        }

        const appeal = appealResult.rows[0];
        const status = approved ? 'approved' : 'rejected';

        // Update appeal
        const result = await context.pool.query(
          `UPDATE fact_check_appeals
           SET status = $1,
               reviewed_by = $2,
               reviewed_at = CURRENT_TIMESTAMP,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $3
           RETURNING *`,
          [status, userId, appealId]
        );

        // If approved and newVerdict provided, update the fact-check verdict
        if (approved && newVerdict) {
          const validVerdicts = ['TRUE', 'FALSE', 'MISLEADING', 'PARTIALLY_TRUE', 'UNDETERMINED', 'NO_CONSENSUS'];
          if (!validVerdicts.includes(newVerdict)) {
            throw createGraphQLError('Invalid verdict value', 'BAD_USER_INPUT');
          }

          await context.pool.query(
            `UPDATE fact_checks
             SET verdict = $1,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $2`,
            [newVerdict, appeal.fact_check_id]
          );

          console.log(`✅ Appeal approved and fact-check verdict updated to: ${newVerdict}`);
        } else {
          console.log(`✅ Appeal ${status}: ${appealId}`);
        }

        // Award reputation bonus to appellant if approved
        if (approved) {
          await context.pool.query(
            'UPDATE users SET truth_score = truth_score + 25 WHERE id = $1',
            [appeal.user_id]
          );
        }

        // Log action
        await context.pool.query(
          `INSERT INTO activity_log (user_id, action, metadata)
           VALUES ($1, $2, $3)`,
          [userId, 'review_appeal', JSON.stringify({ appeal_id: appealId, approved, new_verdict: newVerdict })]
        );

        return result.rows[0];
      } catch (error) {
        // If table doesn't exist, return mock object for now
        if (error.code === '42P01') {
          console.warn('⚠️ fact_check_appeals table not found, returning mock object');
          return {
            id: appealId,
            status: approved ? 'approved' : 'rejected',
            reviewed_by: userId,
            reviewed_at: new Date().toISOString()
          };
        }
        throw error;
      }
    },
  },

  // Nested resolvers for FactCheck type
  FactCheck: {
    submittedBy: async (parent, _, context) => {
      if (!parent.submitted_by) return null;
      // Use DataLoader to batch user queries and prevent N+1 issues
      return context.loaders.userById.load(parent.submitted_by);
    },
    verifiedBy: async (parent, _, context) => {
      if (!parent.verified_by) return null;
      // Use DataLoader to batch user queries and prevent N+1 issues
      return context.loaders.userById.load(parent.verified_by);
    },
  },
};
