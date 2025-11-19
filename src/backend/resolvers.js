// src/backend/resolvers.js
// GraphQL resolvers - business logic for all operations

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { GraphQLError } = require('graphql');
const { 
  validateEmail, validatePassword, validateUsername, validateRating, 
  validateTextLength, validateVerdict, validateConfidenceScore, validateUrl 
} = require('./utils/validation');
const { 
  createGraphQLError, handleValidationErrors, safeDatabaseOperation 
} = require('./utils/errorHandler');
const {
  sanitizePlainText,
  sanitizeRichText,
  sanitizeJson
} = require('./utils/sanitizer');
const { requireSecret } = require('../config/secrets');

const JWT_SECRET = requireSecret('JWT_SECRET');

// Helper: Generate JWT token
function generateToken(userId, expiresIn = '7d') {
  try {
    return jwt.sign(
      { userId },
      JWT_SECRET,
      { expiresIn }
    );
  } catch (error) {
    throw createGraphQLError('Failed to generate token', 'INTERNAL_SERVER_ERROR');
  }
}

// Helper: Verify JWT token
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw createGraphQLError('Invalid or expired token', 'INVALID_TOKEN');
  }
}

// Helper: Require authentication
function requireAuth(context) {
  const token = context.req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    throw createGraphQLError('Authentication required', 'UNAUTHENTICATED');
  }
  return verifyToken(token);
}

const resolvers = {
  Query: {
    // Get current user
    me: async (_, __, context) => {
      const { userId } = requireAuth(context);
      const result = await context.pool.query(
        'SELECT * FROM users WHERE id = $1',
        [userId]
      );
      return result.rows[0];
    },

    // Get all apps with filters
    apps: async (_, { category, platform, search, minTruthRating, limit = 20, offset = 0 }, context) => {
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
        query += ` AND (name ILIKE $${paramCount} OR description ILIKE $${paramCount})`;
        params.push(`%${search}%`);
        paramCount++;
      }

      if (minTruthRating) {
        query += ` AND truth_rating >= $${paramCount++}`;
        params.push(minTruthRating);
      }

      query += ` ORDER BY truth_rating DESC LIMIT $${paramCount++} OFFSET $${paramCount++}`;
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

    // Get single app by ID
    app: async (_, { id }, context) => {
      const result = await context.pool.query(
        'SELECT * FROM apps WHERE id = $1',
        [id]
      );
      return result.rows[0];
    },

    // Get trending apps
    trendingApps: async (_, { limit = 10 }, context) => {
      const result = await context.pool.query(
        `SELECT * FROM apps 
         WHERE is_verified = true 
         ORDER BY download_count DESC 
         LIMIT $1`,
        [limit]
      );
      return result.rows;
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
        query += ` AND claim ILIKE $${paramCount}`;
        params.push(`%${search}%`);
        paramCount++;
      }

      query += ` ORDER BY created_at DESC LIMIT $${paramCount++} OFFSET $${paramCount++}`;
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

    // Get user by ID
    user: async (_, { id }, context) => {
      const result = await context.pool.query(
        'SELECT * FROM users WHERE id = $1',
        [id]
      );
      return result.rows[0];
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

    // Get bounties
    bounties: async (_, { status }, context) => {
      let query = 'SELECT * FROM bounties';
      const params = [];
      
      if (status) {
        query += ' WHERE status = $1';
        params.push(status);
      }
      
      query += ' ORDER BY created_at DESC';
      
      const result = await context.pool.query(query, params);
      return result.rows;
    },
  },

  Mutation: {
    // Register new user
    register: async (_, { input }, context) => {
      const rawUsername = sanitizePlainText(input.username);
      const rawEmail = sanitizePlainText(input.email);
      const rawWalletAddress = input.walletAddress ? sanitizePlainText(input.walletAddress) : null;
      const { password } = input;

      const username = rawUsername;
      const email = rawEmail;
      const walletAddress = rawWalletAddress;

      // Validate inputs
      const emailValidation = validateEmail(email);
      if (!emailValidation.valid) {
        throw createGraphQLError(emailValidation.message, 'INVALID_EMAIL');
      }

      const usernameValidation = validateUsername(username);
      if (!usernameValidation.valid) {
        throw createGraphQLError(usernameValidation.message, 'BAD_USER_INPUT');
      }

      const passwordValidation = validatePassword(password);
      if (!passwordValidation.valid) {
        throw createGraphQLError(passwordValidation.message, 'INVALID_PASSWORD');
      }

      if (walletAddress) {
        const addressValidation = require('./utils/validation').validateEthAddress(walletAddress);
        if (!addressValidation.valid) {
          throw createGraphQLError(addressValidation.message, 'BAD_USER_INPUT');
        }
      }

      // Check if user exists
      const existing = await context.pool.query(
        'SELECT id FROM users WHERE email = $1 OR username = $2',
        [email.toLowerCase(), username.toLowerCase()]
      );

      if (existing.rows.length > 0) {
        throw createGraphQLError('User already exists', 'ALREADY_EXISTS');
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Create user
      const result = await context.pool.query(
        `INSERT INTO users (username, email, password_hash, wallet_address)
         VALUES ($1, $2, $3, $4)
         RETURNING id, username, email, wallet_address, truth_score, is_verified, role, created_at`,
        [username, email.toLowerCase(), passwordHash, walletAddress]
      );

      const user = result.rows[0];
      const token = generateToken(user.id);
      const refreshToken = generateToken(user.id, '30d');

      return { token, refreshToken, user };
    },

    // Login user
    login: async (_, { input }, context) => {
      const email = sanitizePlainText(input.email);
      const { password } = input;

      // Validate inputs
      const emailValidation = validateEmail(email);
      if (!emailValidation.valid) {
        throw createGraphQLError(emailValidation.message, 'INVALID_EMAIL');
      }

      if (!password || typeof password !== 'string') {
        throw createGraphQLError('Password is required', 'BAD_USER_INPUT');
      }

      // Find user
      const result = await context.pool.query(
        'SELECT * FROM users WHERE email = $1',
        [email.toLowerCase()]
      );

      if (result.rows.length === 0) {
        throw createGraphQLError('Invalid email or password', 'UNAUTHENTICATED');
      }

      const user = result.rows[0];

      // Verify password
      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        throw createGraphQLError('Invalid email or password', 'UNAUTHENTICATED');
      }

      // Update last login
      await context.pool.query(
        'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
        [user.id]
      );

      const token = generateToken(user.id);
      const refreshToken = generateToken(user.id, '30d');

      // Return user without password hash
      const { password_hash, ...userSafe } = user;
      return { token, refreshToken, user: userSafe };
    },

    // Submit fact check
    submitFactCheck: async (_, { input }, context) => {
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
    },

    // Submit review
    submitReview: async (_, { input }, context) => {
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
    },

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

  // Nested resolvers (for related data)
  // Uses batch loaders from context to prevent N+1 queries
  App: {
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
  },

  User: {
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

  FactCheck: {
    submittedBy: async (parent, _, context) => {
      if (!parent.submitted_by) return null;
      const result = await context.pool.query(
        'SELECT * FROM users WHERE id = $1',
        [parent.submitted_by]
      );
      return result.rows[0];
    },
    verifiedBy: async (parent, _, context) => {
      if (!parent.verified_by) return null;
      const result = await context.pool.query(
        'SELECT * FROM users WHERE id = $1',
        [parent.verified_by]
      );
      return result.rows[0];
    },
  },
};

module.exports = resolvers;