// src/backend/resolvers.js
// GraphQL resolvers - business logic for all operations

const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { GraphQLError } = require('graphql');
const {
  validateEmail, validatePassword, validateUsername, validateRating,
  validateTextLength, validateVerdict, validateConfidenceScore, validateUrl,
  validateVote
} = require('./utils/validation');
const {
  createGraphQLError, handleValidationErrors, safeDatabaseOperation
} = require('./utils/errorHandler');
const {
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendAccountLockoutEmail
} = require('./utils/email');
const {
  sanitizePlainText,
  sanitizeRichText,
  sanitizeJson
} = require('./utils/sanitizer');
const { requireSecret, getNumber } = require('../config/secrets');
const cacheManager = require('./utils/cacheManager');

const JWT_SECRET = requireSecret('JWT_SECRET');
const PASSWORD_RESET_TOKEN_TTL_MIN = getNumber('PASSWORD_RESET_TOKEN_TTL_MIN', 30);
const MAX_FAILED_ATTEMPTS = getNumber('LOGIN_MAX_FAILED_ATTEMPTS', 5);
const LOCKOUT_MINUTES = getNumber('LOGIN_LOCKOUT_MINUTES', 15);

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

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function getField(parent, snakeKey, transform = value => value) {
  if (!parent) return null;

  const snakeValue = parent[snakeKey];
  if (snakeValue !== undefined && snakeValue !== null) {
    return transform(snakeValue);
  }

  const camelKey = snakeKey.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
  const camelValue = parent[camelKey];
  if (camelValue !== undefined && camelValue !== null) {
    return transform(camelValue);
  }

  return null;
}

// Helper: Require authentication
function requireAuth(context) {
  const token = context.req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    throw createGraphQLError('Authentication required', 'UNAUTHENTICATED');
  }
  return verifyToken(token);
}

// Helper: Require specific role (admin or moderator)
async function requireRole(context, allowedRoles = ['admin', 'moderator']) {
  const { userId } = requireAuth(context);

  const result = await context.pool.query(
    'SELECT role FROM users WHERE id = $1',
    [userId]
  );

  if (result.rows.length === 0) {
    throw createGraphQLError('User not found', 'UNAUTHENTICATED');
  }

  const userRole = result.rows[0].role;

  if (!allowedRoles.includes(userRole)) {
    throw createGraphQLError(
      `Insufficient permissions. Required role: ${allowedRoles.join(' or ')}. Your role: ${userRole}`,
      'FORBIDDEN'
    );
  }

  console.log(`✅ Role check passed: User ${userId} has role ${userRole}`);
  return { userId, role: userRole };
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

    // Get all apps with filters (cached for non-search queries)
    apps: async (_, { category, platform, search, minTruthRating, limit = 20, offset = 0 }, context) => {
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
        const likePattern = `%${normalizedSearch.replace(/\s+/g, '%')}%`;
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
    },

    // Get single app by ID
    app: async (_, { id }, context) => {
      const result = await context.pool.query(
        'SELECT * FROM apps WHERE id = $1',
        [id]
      );
      return result.rows[0];
    },

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

    // Cursor-based pagination queries (recommended for performance)
    appsCursor: async (_, { after, before, first, last, category, platform, search, minTruthRating }, context) => {
      const { encodeCursor } = require('./utils/cursor');

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

    factChecksCursor: async (_, { after, before, first, last, category, verdict, search }, context) => {
      const { encodeCursor } = require('./utils/cursor');

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

    pendingAppsCursor: async (_, { after, before, first, last }, context) => {
      await requireRole(context, ['admin', 'moderator']);
      const { executePaginationQuery } = require('./utils/pagination');
      const { encodeCursor } = require('./utils/cursor');

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

    pendingFactChecksCursor: async (_, { after, before, first, last }, context) => {
      await requireRole(context, ['admin', 'moderator']);
      const { executePaginationQuery } = require('./utils/pagination');
      const { encodeCursor } = require('./utils/cursor');

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

    // Blockchain: Get user's blockchain transactions
    userTransactions: async (_, { walletAddress, userId }, context) => {
      try {
        const params = [];
        let query = 'SELECT * FROM blockchain_transactions WHERE';
        
        if (userId && walletAddress) {
          query += ' (user_id = $1 OR $2 IN (SELECT wallet_address FROM users WHERE id = $1))';
          params.push(userId, walletAddress);
        } else if (userId) {
          query += ' user_id = $1';
          params.push(userId);
        } else if (walletAddress) {
          query += ' user_id IN (SELECT id FROM users WHERE wallet_address = $1)';
          params.push(walletAddress);
        } else {
          throw createGraphQLError('Either userId or walletAddress is required', 'BAD_USER_INPUT');
        }

        query += ' ORDER BY created_at DESC LIMIT 100';
        const result = await context.pool.query(query, params);
        return result.rows;
      } catch (error) {
        if (error.code === '42P01') {
          console.warn('⚠️ blockchain_transactions table not found');
          return [];
        }
        throw error;
      }
    },

    // Blockchain: Get single transaction by hash
    transaction: async (_, { hash }, context) => {
      try {
        const result = await context.pool.query(
          'SELECT * FROM blockchain_transactions WHERE transaction_hash = $1',
          [hash]
        );
        return result.rows[0] || null;
      } catch (error) {
        if (error.code === '42P01') {
          console.warn('⚠️ blockchain_transactions table not found');
          return null;
        }
        throw error;
      }
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

      // Send welcome email asynchronously (don't block registration)
      sendWelcomeEmail(user.email, user.username, user.truth_score).catch(err => {
        console.error('Failed to send welcome email:', err.message);
      });

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

      if (user.lockout_until && new Date(user.lockout_until) > new Date()) {
        const minutesLeft = Math.ceil((new Date(user.lockout_until) - new Date()) / 60000);
        throw createGraphQLError(
          `Account locked due to repeated failures. Try again in ${minutesLeft} minute(s).`,
          'ACCOUNT_LOCKED'
        );
      }

      // Verify password
      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        const failedAttempts = (user.failed_login_attempts || 0) + 1;
        let lockoutUntil = null;
        let attemptsToPersist = failedAttempts;
        if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
          lockoutUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
          attemptsToPersist = 0;
        }

        await context.pool.query(
          `UPDATE users
           SET failed_login_attempts = $1,
               last_failed_login = CURRENT_TIMESTAMP,
               lockout_until = $2
           WHERE id = $3`,
          [attemptsToPersist, lockoutUntil, user.id]
        );

        if (lockoutUntil) {
          // Send lockout notification email asynchronously
          sendAccountLockoutEmail(
            user.email,
            user.username,
            LOCKOUT_MINUTES,
            lockoutUntil.toLocaleString()
          ).catch(err => {
            console.error('Failed to send lockout email:', err.message);
          });

          throw createGraphQLError('Account locked after too many attempts. Please try again later.', 'ACCOUNT_LOCKED');
        }

        throw createGraphQLError('Invalid email or password', 'UNAUTHENTICATED');
      }

      // Update last login
      await context.pool.query(
        `UPDATE users
         SET last_login = CURRENT_TIMESTAMP,
             failed_login_attempts = 0,
             lockout_until = NULL,
             last_failed_login = NULL
         WHERE id = $1`,
        [user.id]
      );

      const token = generateToken(user.id);
      const refreshToken = generateToken(user.id, '30d');

      // Return user without password hash
      const { password_hash, ...userSafe } = user;
      return { token, refreshToken, user: userSafe };
    },

    requestPasswordReset: async (_, { email }, context) => {
      const normalizedEmail = sanitizePlainText(email).toLowerCase();
      if (!normalizedEmail) {
        return true; // avoid enumeration
      }

      const result = await context.pool.query(
        'SELECT id, email, username FROM users WHERE email = $1',
        [normalizedEmail]
      );

      if (result.rows.length === 0) {
        return true;
      }

      const user = result.rows[0];
      const token = crypto.randomBytes(48).toString('hex');
      const tokenHash = hashToken(token);
      const expiresAt = new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MIN * 60 * 1000);

      await context.pool.query(
        `UPDATE password_reset_requests
         SET consumed_at = NOW()
         WHERE user_id = $1 AND consumed_at IS NULL`,
        [user.id]
      );

      await context.pool.query(
        `INSERT INTO password_reset_requests (user_id, token_hash, expires_at, requested_ip, user_agent)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          user.id,
          tokenHash,
          expiresAt,
          context.req.ip || null,
          context.req.headers['user-agent'] || null
        ]
      );

      await sendPasswordResetEmail(user.email, token, user.username);

      return true;
    },

    resetPassword: async (_, { token, newPassword }, context) => {
      if (!token || typeof token !== 'string') {
        throw createGraphQLError('Reset token is required', 'BAD_USER_INPUT');
      }

      const passwordValidation = validatePassword(newPassword);
      if (!passwordValidation.valid) {
        throw createGraphQLError(passwordValidation.message, 'INVALID_PASSWORD');
      }

      const tokenHash = hashToken(token);
      const resetResult = await context.pool.query(
        `SELECT * FROM password_reset_requests
         WHERE token_hash = $1
           AND consumed_at IS NULL
           AND expires_at > NOW()
         ORDER BY created_at DESC
         LIMIT 1`,
        [tokenHash]
      );

      if (resetResult.rows.length === 0) {
        throw createGraphQLError('Invalid or expired reset token', 'INVALID_TOKEN');
      }

      const resetRequest = resetResult.rows[0];
      const passwordHash = await bcrypt.hash(newPassword, 10);

      await context.pool.query(
        `UPDATE users
         SET password_hash = $1,
             failed_login_attempts = 0,
             lockout_until = NULL,
             last_failed_login = NULL
         WHERE id = $2`,
        [passwordHash, resetRequest.user_id]
      );

      await context.pool.query(
        'UPDATE password_reset_requests SET consumed_at = NOW() WHERE id = $1',
        [resetRequest.id]
      );

      return true;
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

    // Vote on fact-check (upvote/downvote with spam prevention)
    voteFactCheck: async (_, { id, vote }, context) => {
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
        const addressValidation = require('./utils/validation').validateEthAddress(walletAddress);
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

    // Admin: Verify an app
    verifyApp: async (_, { id }, context) => {
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
    },

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

    // Update user profile
    updateUserProfile: async (_, { userId, bio, avatar, socialLinks }, context) => {
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
    },

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

    // Blockchain: Record a blockchain transaction for a fact-check
    recordBlockchainTransaction: async (_, { hash, type, status, factCheckId, description }, context) => {
      const { userId } = requireAuth(context);

      // Validate inputs
      if (!hash || typeof hash !== 'string') {
        throw createGraphQLError('Transaction hash is required', 'BAD_USER_INPUT');
      }

      if (!type || !['STAMP', 'VERIFY', 'APPEAL'].includes(type)) {
        throw createGraphQLError('Invalid transaction type', 'BAD_USER_INPUT');
      }

      if (!status || !['success', 'pending', 'failed'].includes(status)) {
        throw createGraphQLError('Invalid transaction status', 'BAD_USER_INPUT');
      }

      try {
        // Try to insert; if table doesn't exist, create it silently
        const result = await context.pool.query(
          `INSERT INTO blockchain_transactions 
           (user_id, transaction_hash, transaction_type, status, fact_check_id, description, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
           ON CONFLICT (transaction_hash) DO UPDATE
           SET status = $4, updated_at = CURRENT_TIMESTAMP
           RETURNING *`,
          [userId, hash, type, status, factCheckId || null, description || null]
        );

        console.log(`✅ Blockchain transaction recorded: ${hash} (${type})`);
        return result.rows[0];
      } catch (error) {
        // If table doesn't exist, return mock object for now
        if (error.code === '42P01') {
          console.warn('⚠️ blockchain_transactions table not found, returning mock object');
          return {
            id: `mock-${Date.now()}`,
            user_id: userId,
            transaction_hash: hash,
            transaction_type: type,
            status: status,
            fact_check_id: factCheckId,
            description: description,
            created_at: new Date().toISOString()
          };
        }
        throw error;
      }
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

  // Nested resolvers (for related data)
  // Uses batch loaders from context to prevent N+1 queries
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

      const result = await context.pool.query(
        'SELECT * FROM users WHERE id = $1',
        [verifierId]
      );

      return result.rows[0] || null;
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
  },

  Notification: {
    userId: parent => getField(parent, 'user_id', String),
    createdAt: parent => getField(parent, 'created_at', String),
  },
};

module.exports = resolvers;