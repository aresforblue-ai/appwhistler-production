// Shared helper functions for resolvers
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { createGraphQLError } = require('../utils/errorHandler');
const { requireSecret } = require('../../config/secrets');

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

// Helper: Hash token for storage
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// Helper: Get field with snake_case or camelCase fallback
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

  logger.info(`✅ Role check passed: User ${userId} has role ${userRole}`);
  return { userId, role: userRole };
}

module.exports = {
  generateToken,
  verifyToken,
  hashToken,
  getField,
  requireAuth,
  requireRole
};
