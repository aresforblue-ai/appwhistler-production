// backend/constants/rateLimits.js
// Rate limiting constants for API protection

module.exports = {
  // Maximum requests per window for anonymous users
  ANONYMOUS_LIMIT: 100,

  // Maximum requests per window for authenticated users
  AUTHENTICATED_LIMIT: 400,

  // Maximum requests per window for admin users
  ADMIN_LIMIT: 1000,

  // Time window in milliseconds (15 minutes)
  WINDOW_MS: 15 * 60 * 1000
};
