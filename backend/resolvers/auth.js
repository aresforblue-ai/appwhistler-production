// Authentication resolvers
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const {
  validateEmail, validatePassword, validateUsername
} = require('../utils/validation');
const { createGraphQLError, withErrorHandling } = require('../utils/errorHandler');
const {
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendAccountLockoutEmail
} = require('../utils/email');
const { sanitizePlainText } = require('../utils/sanitizer');
const { getNumber } = require('../../config/secrets');
const { generateToken, verifyToken, hashToken, requireAuth } = require('./helpers');

const PASSWORD_RESET_TOKEN_TTL_MIN = getNumber('PASSWORD_RESET_TOKEN_TTL_MIN', 30);
const MAX_FAILED_ATTEMPTS = getNumber('LOGIN_MAX_FAILED_ATTEMPTS', 5);
const LOCKOUT_MINUTES = getNumber('LOGIN_LOCKOUT_MINUTES', 15);

module.exports = {
  Query: {
    // Get current user
    me: withErrorHandling(async (_, __, context) => {
      const { userId } = requireAuth(context);
      // Use DataLoader to batch user queries
      return context.loaders.userById.load(userId);
    }),
  },

  Mutation: {
    // Register new user
    register: withErrorHandling(async (_, { input }, context) => {
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
        const addressValidation = require('../utils/validation').validateEthAddress(walletAddress);
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
    }),

    // Login user
    login: withErrorHandling(async (_, { input }, context) => {
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
    }),

    // Request password reset
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

    // Reset password with token
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
  }
};
