// backend/agents/trendingDetectionAgent.js
// AI agent for detecting trending apps, topics, and emerging patterns

class TrendingDetectionAgent {
  constructor() {
    this.name = 'TrendingDetectionAgent';
    this.version = '1.0.0';
    this.initialized = false;
    this.totalProcessed = 0;
    this.lastUsed = null;

    // Trending calculation weights
    this.weights = {
      recentGrowth: 0.4,
      velocity: 0.3,
      engagement: 0.2,
      recency: 0.1,
    };

    // Time windows for analysis
    this.timeWindows = {
      short: 24 * 60 * 60 * 1000, // 24 hours
      medium: 7 * 24 * 60 * 60 * 1000, // 7 days
      long: 30 * 24 * 60 * 60 * 1000, // 30 days
    };
  }

  async initialize() {
    console.log(`🤖 Initializing ${this.name}...`);
    this.initialized = true;
    return { status: 'ready', agent: this.name };
  }

  /**
   * Detect trending items
   * @param {Array} items - Items to analyze (apps, topics, etc.)
   * @param {Object} options - Detection options
   * @returns {Object} Trending detection result
   */
  async process(items, options = {}) {
    if (!items || items.length === 0) {
      throw new Error('No items provided for trending analysis');
    }

    const { limit = 10, category = null, timeWindow = 'medium' } = options;

    // Calculate trending scores for each item
    const scored = items.map(item => ({
      item,
      trendingScore: this.calculateTrendingScore(item, timeWindow),
      metrics: this.extractMetrics(item),
      reason: this.getTrendingReason(item),
    }));

    // Sort by trending score
    const sorted = scored.sort((a, b) => b.trendingScore - a.trendingScore);

    // Filter by category if specified
    const filtered = category ? sorted.filter(s => s.item.category === category) : sorted;

    // Get top trending
    const trending = filtered.slice(0, limit);

    // Detect emerging trends
    const emerging = this.detectEmerging(items);

    // Detect declining trends
    const declining = this.detectDeclining(items);

    this.totalProcessed++;
    this.lastUsed = new Date().toISOString();

    return {
      trending,
      emerging,
      declining,
      totalAnalyzed: items.length,
      timeWindow,
      calculatedAt: new Date().toISOString(),
    };
  }

  /**
   * Calculate trending score for an item
   */
  calculateTrendingScore(item, timeWindow) {
    const windowMs = this.timeWindows[timeWindow] || this.timeWindows.medium;

    // Calculate individual components
    const growthScore = this.calculateGrowthScore(item, windowMs);
    const velocityScore = this.calculateVelocityScore(item, windowMs);
    const engagementScore = this.calculateEngagementScore(item);
    const recencyScore = this.calculateRecencyScore(item);

    // Weighted sum
    const trendingScore =
      growthScore * this.weights.recentGrowth +
      velocityScore * this.weights.velocity +
      engagementScore * this.weights.engagement +
      recencyScore * this.weights.recency;

    return Math.min(Math.max(trendingScore, 0), 1);
  }

  /**
   * Calculate growth score (how much has it grown recently)
   */
  calculateGrowthScore(item, windowMs) {
    const now = Date.now();
    const windowStart = now - windowMs;

    const metrics = item.metrics || {};
    const currentValue = metrics.views || metrics.downloads || 0;
    const previousValue = metrics.previousViews || metrics.previousDownloads || currentValue * 0.8;

    if (previousValue === 0) return currentValue > 0 ? 1 : 0;

    const growth = (currentValue - previousValue) / previousValue;

    // Normalize to 0-1 scale (cap at 500% growth)
    return Math.min(growth / 5, 1);
  }

  /**
   * Calculate velocity score (rate of change acceleration)
   */
  calculateVelocityScore(item, windowMs) {
    const metrics = item.metrics || {};
    const recentGrowth = metrics.growthRate24h || 0;
    const olderGrowth = metrics.growthRate7d || 0;

    if (olderGrowth === 0) return recentGrowth > 0 ? 0.8 : 0.2;

    const acceleration = (recentGrowth - olderGrowth) / Math.abs(olderGrowth);

    // Normalize to 0-1 scale
    return Math.min(Math.max((acceleration + 1) / 2, 0), 1);
  }

  /**
   * Calculate engagement score (how much people interact with it)
   */
  calculateEngagementScore(item) {
    const metrics = item.metrics || {};

    const views = metrics.views || 0;
    const clicks = metrics.clicks || 0;
    const reviews = metrics.reviews || 0;
    const shares = metrics.shares || 0;

    // Calculate engagement rate
    const clickRate = views > 0 ? clicks / views : 0;
    const reviewRate = clicks > 0 ? reviews / clicks : 0;
    const shareRate = clicks > 0 ? shares / clicks : 0;

    // Weighted average of engagement metrics
    const engagementScore = (clickRate * 0.5 + reviewRate * 0.3 + shareRate * 0.2);

    return Math.min(engagementScore, 1);
  }

  /**
   * Calculate recency score (how recent is the activity)
   */
  calculateRecencyScore(item) {
    const lastActivity = item.lastActivityAt || item.updatedAt || item.createdAt;
    if (!lastActivity) return 0.5;

    const now = Date.now();
    const activityTime = new Date(lastActivity).getTime();
    const ageHours = (now - activityTime) / (1000 * 60 * 60);

    // Decay function: recent activity gets higher score
    // Score drops to 0.5 after 24 hours, 0.25 after 7 days
    return Math.max(Math.exp(-ageHours / 24), 0.1);
  }

  /**
   * Extract metrics from item
   */
  extractMetrics(item) {
    const metrics = item.metrics || {};

    return {
      views: metrics.views || 0,
      clicks: metrics.clicks || 0,
      downloads: metrics.downloads || item.downloadCount || 0,
      reviews: metrics.reviews || (item.reviews?.length || 0),
      rating: metrics.rating || item.averageRating || 0,
      shares: metrics.shares || 0,
    };
  }

  /**
   * Get trending reason
   */
  getTrendingReason(item) {
    const metrics = item.metrics || {};

    if (metrics.growthRate24h > 2) return 'rapid_growth';
    if (metrics.shares > 100) return 'highly_shared';
    if (metrics.reviews > 50) return 'popular_reviews';
    if (item.isVerified) return 'recently_verified';

    return 'increasing_interest';
  }

  /**
   * Detect emerging trends
   */
  detectEmerging(items) {
    return items
      .filter(item => {
        const metrics = item.metrics || {};
        const age = Date.now() - new Date(item.createdAt || Date.now()).getTime();
        const ageInDays = age / (1000 * 60 * 60 * 24);

        // New items (< 7 days old) with significant growth
        return ageInDays < 7 && (metrics.growthRate24h || 0) > 1;
      })
      .map(item => ({
        item,
        reason: 'new_and_growing_fast',
        ageInDays: Math.round(
          (Date.now() - new Date(item.createdAt || Date.now()).getTime()) / (1000 * 60 * 60 * 24)
        ),
      }))
      .slice(0, 5);
  }

  /**
   * Detect declining trends
   */
  detectDeclining(items) {
    return items
      .filter(item => {
        const metrics = item.metrics || {};

        // Negative growth and declining velocity
        return (
          (metrics.growthRate24h || 0) < -0.2 &&
          (metrics.growthRate24h || 0) < (metrics.growthRate7d || 0)
        );
      })
      .map(item => ({
        item,
        reason: 'declining_interest',
        declineRate: item.metrics?.growthRate24h || 0,
      }))
      .slice(0, 5);
  }

  async shutdown() {
    console.log(`🛑 Shutting down ${this.name}...`);
    this.initialized = false;
  }
}

module.exports = new TrendingDetectionAgent();
