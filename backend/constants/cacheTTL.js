// backend/constants/cacheTTL.js
// Cache Time-To-Live (TTL) constants in seconds

module.exports = {
  // Filtered apps query cache (10 minutes)
  APPS_FILTERED: 600,

  // Trending apps cache (5 minutes)
  TRENDING_APPS: 300,

  // User profile cache (30 minutes)
  USER_PROFILE: 1800,

  // Fact checks cache (2 minutes)
  FACT_CHECKS: 120,

  // Static data cache (24 hours)
  STATIC_DATA: 86400
};
