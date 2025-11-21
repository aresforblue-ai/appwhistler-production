// User-related resolvers
const { validateUsername } = require('../utils/validation');
const { createGraphQLError, withErrorHandling } = require('../utils/errorHandler');
const { sanitizePlainText } = require('../utils/sanitizer');
const { requireAuth, getField } = require('./helpers');

module.exports = {
  Query: {
    // Get user by ID
    user: async (_, { id }, context) => {
      // Use DataLoader to batch user queries and prevent N+1 issues
      return context.loaders.userById.load(id);
    },

    // Get leaderboard (top truth scores)
    leaderboard: async (_, { limit = 100 }, context) => {
      const result = await context.pool.query(
        `SELECT * FROM users
         ORDER BY truth_score DESC
         LIMIT $1`,
        [limit]
      );
      return result.rows;
    },
  },

  Mutation: {
    // Update user avatar (called after uploading to IPFS)
    updateAvatar: async (_, { avatarUrl, thumbnailUrl, ipfsHash }, context) => {
      const { userId } = requireAuth(context);

      // Validate URLs
      if (!avatarUrl || typeof avatarUrl !== 'string') {
        throw createGraphQLError('Avatar URL is required', 'BAD_USER_INPUT');
      }

      if (!ipfsHash || typeof ipfsHash !== 'string') {
        throw createGraphQLError('IPFS hash is required', 'BAD_USER_INPUT');
      }

      // Update user avatar in database
      const result = await context.pool.query(
        `UPDATE users
         SET avatar_url = $1,
             avatar_thumbnail_url = $2,
             avatar_ipfs_hash = $3,
             avatar_uploaded_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $4
         RETURNING *`,
        [avatarUrl, thumbnailUrl || null, ipfsHash, userId]
      );

      if (result.rows.length === 0) {
        throw createGraphQLError('User not found', 'NOT_FOUND');
      }

      const user = result.rows[0];
      console.log(`✅ Avatar updated for user ${userId}`);

      return user;
    },

    // Update user profile (existing mutation - implementation added)
    updateProfile: async (_, { username, walletAddress }, context) => {
      const { userId } = requireAuth(context);

      // Build dynamic update query
      const updates = [];
      const params = [];
      let paramCount = 1;

      if (username) {
        const usernameValidation = validateUsername(username);
        if (!usernameValidation.valid) {
          throw createGraphQLError(usernameValidation.message, 'BAD_USER_INPUT');
        }
        updates.push(`username = $${paramCount}`);
        params.push(sanitizePlainText(username));
        paramCount++;
      }

      if (walletAddress) {
        const addressValidation = require('../utils/validation').validateEthAddress(walletAddress);
        if (!addressValidation.valid) {
          throw createGraphQLError(addressValidation.message, 'BAD_USER_INPUT');
        }
        updates.push(`wallet_address = $${paramCount}`);
        params.push(sanitizePlainText(walletAddress));
        paramCount++;
      }

      if (updates.length === 0) {
        throw createGraphQLError('No updates provided', 'BAD_USER_INPUT');
      }

      updates.push(`updated_at = CURRENT_TIMESTAMP`);
      params.push(userId);

      const query = `
        UPDATE users
        SET ${updates.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `;

      const result = await context.pool.query(query, params);

      if (result.rows.length === 0) {
        throw createGraphQLError('User not found', 'NOT_FOUND');
      }

      return result.rows[0];
    },

    // Update user profile
    updateUserProfile: withErrorHandling(async (_, { userId, bio, avatar, socialLinks }, context) => {
      const { userId: authUserId } = requireAuth(context);

      // Users can only update their own profile unless admin
      if (authUserId !== userId && context.user?.role !== 'admin') {
        throw createGraphQLError('Unauthorized to update this profile', 'FORBIDDEN');
      }

      try {
        const result = await context.pool.query(
          `UPDATE users
           SET bio = COALESCE($1, bio),
               avatar = COALESCE($2, avatar),
               social_links = COALESCE($3, social_links),
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $4
           RETURNING *`,
          [bio || null, avatar || null, JSON.stringify(socialLinks) || null, userId]
        );

        if (result.rows.length === 0) {
          throw createGraphQLError('User not found', 'NOT_FOUND');
        }

        console.log(`✅ Profile updated for user ${userId}`);
        return result.rows[0];
      } catch (error) {
        console.error('Update profile error:', error);
        throw createGraphQLError('Failed to update profile', 'INTERNAL_ERROR');
      }
    }),

    // Update user preferences
    updateUserPreferences: async (_, { userId, preferences }, context) => {
      const { userId: authUserId } = requireAuth(context);

      // Users can only update their own preferences
      if (authUserId !== userId && context.user?.role !== 'admin') {
        throw createGraphQLError('Unauthorized to update preferences', 'FORBIDDEN');
      }

      try {
        const result = await context.pool.query(
          `UPDATE users
           SET preferences = $1,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $2
           RETURNING *`,
          [JSON.stringify(preferences), userId]
        );

        if (result.rows.length === 0) {
          throw createGraphQLError('User not found', 'NOT_FOUND');
        }

        console.log(`✅ Preferences updated for user ${userId}`);
        return result.rows[0];
      } catch (error) {
        console.error('Update preferences error:', error);
        throw createGraphQLError('Failed to update preferences', 'INTERNAL_ERROR');
      }
    },
  },

  // Nested resolvers for User type
  User: {
    avatar: parent => getField(parent, 'avatar', String),
    avatarUrl: parent => getField(parent, 'avatar_url', String),
    avatarThumbnailUrl: parent => getField(parent, 'avatar_thumbnail_url', String),
    avatarUploadedAt: parent => getField(parent, 'avatar_uploaded_at', String),
    walletAddress: parent => getField(parent, 'wallet_address', String),
    truthScore: parent => getField(parent, 'truth_score', Number),
    isVerified: parent => getField(parent, 'is_verified', Boolean),
    createdAt: parent => getField(parent, 'created_at', String),
    socialLinks: (parent) => {
      if (!parent.social_links) return [];
      return JSON.parse(parent.social_links);
    },
    preferences: (parent) => {
      if (!parent.preferences) {
        return {
          notifications: { email: true, push: true, inApp: true },
          privacy: { profileVisibility: 'public', showReputation: true },
          theme: 'dark'
        };
      }
      return JSON.parse(parent.preferences);
    },
    reputation: parent => getField(parent, 'reputation', Number),
    bio: parent => getField(parent, 'bio', String),
    reviews: async (parent, _, context) => {
      const result = await context.pool.query(
        'SELECT * FROM reviews WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100',
        [parent.id]
      );
      return result.rows;
    },
    factChecks: async (parent, _, context) => {
      if (context.loaders) {
        return context.loaders.factChecksByUserId.load(parent.id);
      }
      // Fallback
      const result = await context.pool.query(
        'SELECT * FROM fact_checks WHERE submitted_by = $1 ORDER BY created_at DESC LIMIT 100',
        [parent.id]
      );
      return result.rows;
    },
  },

  // Additional User type resolver (for notifications)
  Notification: {
    userId: parent => getField(parent, 'user_id', String),
    createdAt: parent => getField(parent, 'created_at', String),
  },
};
