// Review-related resolvers
const { validateRating, validateTextLength } = require('../utils/validation');
const { createGraphQLError, withErrorHandling } = require('../utils/errorHandler');
const { sanitizeRichText } = require('../utils/sanitizer');
const { requireAuth } = require('./helpers');

module.exports = {
  Query: {
    // No review-specific queries (reviews are accessed via App and User types)
  },

  Mutation: {
    // Submit review
    submitReview: withErrorHandling(async (_, { input }, context) => {
      const { userId } = requireAuth(context);
      const { appId, rating } = input;
      const reviewText = input.reviewText ? sanitizeRichText(input.reviewText) : null;

      // Validate inputs
      const ratingValidation = validateRating(rating, 0, 5);
      if (!ratingValidation.valid) {
        throw createGraphQLError(ratingValidation.message, 'BAD_USER_INPUT');
      }

      if (reviewText) {
        const textValidation = validateTextLength(reviewText, 10, 3000, 'Review text');
        if (!textValidation.valid) {
          throw createGraphQLError(textValidation.message, 'BAD_USER_INPUT');
        }
      }

      // Verify app exists
      const appExists = await context.pool.query(
        'SELECT id FROM apps WHERE id = $1',
        [appId]
      );

      if (appExists.rows.length === 0) {
        throw createGraphQLError('App not found', 'NOT_FOUND');
      }

      const result = await context.pool.query(
        `INSERT INTO reviews (app_id, user_id, rating, review_text)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (app_id, user_id)
         DO UPDATE SET rating = $3, review_text = $4
         RETURNING *`,
        [appId, userId, rating, reviewText]
      );

      return result.rows[0];
    }),
  },
};
