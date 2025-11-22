// src/backend/middleware/rateLimiter.js
// Tiered rate limiter that differentiates between anonymous, authenticated, and admin users

const rateLimit = require('express-rate-limit');
const { getNumber, getArray } = require('../../config/secrets.cjs');

const windowMinutes = getNumber('RATE_LIMIT_WINDOW', 15);
const windowMs = windowMinutes * 60 * 1000;

const anonymousLimit = getNumber('RATE_LIMIT_ANONYMOUS_MAX_REQUESTS', getNumber('RATE_LIMIT_MAX_REQUESTS', 100));
const authenticatedLimit = getNumber('RATE_LIMIT_AUTHENTICATED_MAX_REQUESTS', 400);
const adminLimit = getNumber('RATE_LIMIT_ADMIN_MAX_REQUESTS', 1000);

const whitelist = new Set(getArray('RATE_LIMIT_WHITELIST', ',', []));

function resolveLimit(req) {
  if (req.user?.role === 'admin') {
    return adminLimit;
  }

  if (req.user?.userId) {
    return authenticatedLimit;
  }

  return anonymousLimit;
}

function isWhitelisted(req) {
  const ip = req.ip;
  const userId = req.user?.userId?.toString();

  if (userId && (whitelist.has(userId) || whitelist.has(`user:${userId}`))) {
    return true;
  }

  if (ip && whitelist.has(ip)) {
    return true;
  }

  return false;
}

const perUserRateLimiter = rateLimit({
  windowMs,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests, please try again later.',
  skip: (req) => isWhitelisted(req),
  // Simplified key generator - authenticated users use userId, others use default IP handling
  keyGenerator: (req) => {
    if (req.user?.userId) {
      return `user:${req.user.userId}`;
    }
    // Return undefined to use default IP key generation
    return undefined;
  },
  max: (req, res) => resolveLimit(req),
  handler: (req, res, next, options) => {
    res.status(options.statusCode).json({
      success: false,
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many requests, please slow down.',
        retryAfterSeconds: Math.ceil(options.windowMs / 1000)
      }
    });
  }
});

module.exports = {
  perUserRateLimiter,
  resolveLimit
};
