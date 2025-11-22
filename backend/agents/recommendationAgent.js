// backend/agents/recommendationAgent.js
// AI agent for personalized app recommendations based on user preferences and behavior

class RecommendationAgent {
  constructor() {
    this.name = 'RecommendationAgent';
    this.version = '1.0.0';
    this.initialized = false;
    this.totalProcessed = 0;
    this.lastUsed = null;

    // Recommendation strategies
    this.strategies = {
      collaborative: 0.4, // Based on similar users
      content: 0.3, // Based on app features
      popularity: 0.2, // Based on trending
      diversity: 0.1, // Promote variety
    };
  }

  async initialize() {
    console.log(`🤖 Initializing ${this.name}...`);
    this.initialized = true;
    return { status: 'ready', agent: this.name };
  }

  /**
   * Generate personalized recommendations
   * @param {Object} userProfile - User preferences, history, ratings
   * @param {Array} availableApps - Pool of apps to recommend from
   * @param {Object} options - Recommendation options (limit, filters, etc.)
   * @returns {Object} Recommendation result
   */
  async process(userProfile, options = {}) {
    const { availableApps = [], limit = 10, filters = {} } = options;

    if (availableApps.length === 0) {
      throw new Error('No apps available for recommendations');
    }

    // Calculate scores for each app
    const scoredApps = availableApps.map(app => ({
      app,
      score: this.calculateRecommendationScore(app, userProfile),
      reasons: this.getRecommendationReasons(app, userProfile),
    }));

    // Sort by score and apply diversity
    const ranked = scoredApps
      .sort((a, b) => b.score - a.score)
      .filter(item => this.applyFilters(item.app, filters));

    // Apply diversity to avoid too many similar apps
    const diverse = this.ensureDiversity(ranked, limit);

    this.totalProcessed++;
    this.lastUsed = new Date().toISOString();

    return {
      recommendations: diverse.slice(0, limit),
      totalConsidered: availableApps.length,
      totalFiltered: ranked.length,
      strategies: this.strategies,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Calculate recommendation score for an app
   */
  calculateRecommendationScore(app, userProfile) {
    let score = 0;

    // Collaborative filtering score
    const collaborativeScore = this.getCollaborativeScore(app, userProfile);
    score += collaborativeScore * this.strategies.collaborative;

    // Content-based score
    const contentScore = this.getContentScore(app, userProfile);
    score += contentScore * this.strategies.content;

    // Popularity score
    const popularityScore = this.getPopularityScore(app);
    score += popularityScore * this.strategies.popularity;

    // Diversity bonus
    const diversityBonus = this.getDiversityBonus(app, userProfile);
    score += diversityBonus * this.strategies.diversity;

    return score;
  }

  /**
   * Get collaborative filtering score (similar users liked this)
   */
  getCollaborativeScore(app, userProfile) {
    // In production, this would use actual collaborative filtering algorithms
    // For now, use a simplified version based on category preferences

    const userCategories = userProfile.favoriteCategories || [];
    const appCategory = app.category;

    if (userCategories.includes(appCategory)) {
      return 0.9;
    }

    return 0.5;
  }

  /**
   * Get content-based score (app features match user preferences)
   */
  getContentScore(app, userProfile) {
    let score = 0.5; // Base score

    // Truth rating alignment
    if (app.truthRating >= 80) {
      score += 0.3;
    }

    // Privacy score alignment
    if (app.privacyScore >= 80) {
      score += 0.2;
    }

    // Security score alignment
    if (app.securityScore >= 80) {
      score += 0.2;
    }

    // User preference alignment
    if (userProfile.preferences) {
      if (userProfile.preferences.preferVerified && app.isVerified) {
        score += 0.3;
      }
    }

    return Math.min(score, 1.0);
  }

  /**
   * Get popularity score
   */
  getPopularityScore(app) {
    const downloads = app.downloadCount || 0;

    // Normalize download count to 0-1 scale (log scale)
    if (downloads === 0) return 0.3;

    const logDownloads = Math.log10(downloads);
    const maxLog = 10; // 10 billion downloads
    return Math.min(logDownloads / maxLog, 1.0);
  }

  /**
   * Get diversity bonus
   */
  getDiversityBonus(app, userProfile) {
    const recentApps = userProfile.recentlyViewed || [];
    const recentCategories = recentApps.map(a => a.category);

    // Bonus for apps from categories user hasn't explored recently
    if (!recentCategories.includes(app.category)) {
      return 0.8;
    }

    return 0.2;
  }

  /**
   * Get recommendation reasons
   */
  getRecommendationReasons(app, userProfile) {
    const reasons = [];

    if (app.truthRating >= 85) {
      reasons.push('High truth rating');
    }

    if (app.isVerified) {
      reasons.push('Verified by community');
    }

    const userCategories = userProfile.favoriteCategories || [];
    if (userCategories.includes(app.category)) {
      reasons.push(`Popular in ${app.category}`);
    }

    if (app.downloadCount >= 1000000) {
      reasons.push('Popular choice');
    }

    return reasons;
  }

  /**
   * Apply filters
   */
  applyFilters(app, filters) {
    if (filters.minTruthRating && app.truthRating < filters.minTruthRating) {
      return false;
    }

    if (filters.category && app.category !== filters.category) {
      return false;
    }

    if (filters.verifiedOnly && !app.isVerified) {
      return false;
    }

    return true;
  }

  /**
   * Ensure diversity in recommendations
   */
  ensureDiversity(rankedApps, limit) {
    const diverse = [];
    const categoryCount = {};

    for (const item of rankedApps) {
      const category = item.app.category;
      const count = categoryCount[category] || 0;

      // Limit to 3 apps per category in top recommendations
      if (count < 3 || diverse.length >= limit) {
        diverse.push(item);
        categoryCount[category] = count + 1;

        if (diverse.length >= limit) {
          break;
        }
      }
    }

    return diverse;
  }

  async shutdown() {
    console.log(`🛑 Shutting down ${this.name}...`);
    this.initialized = false;
  }
}

module.exports = new RecommendationAgent();
