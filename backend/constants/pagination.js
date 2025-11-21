// backend/constants/pagination.js
// Pagination constants to avoid hardcoded values across the codebase

module.exports = {
  // Default page size for paginated queries
  DEFAULT_PAGE_SIZE: 20,

  // Maximum allowed page size to prevent performance issues
  MAX_PAGE_SIZE: 100,

  // Default size for leaderboard queries
  DEFAULT_LEADERBOARD_SIZE: 100,

  // Number of trending apps to return by default
  TRENDING_APPS_LIMIT: 10,

  // Maximum number of items to return for related data queries
  MAX_RELATED_ITEMS: 100
};
