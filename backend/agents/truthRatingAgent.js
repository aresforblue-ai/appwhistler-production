// backend/agents/truthRatingAgent.js
// AI agent for calculating truth ratings based on multiple factors

class TruthRatingAgent {
  constructor() {
    this.name = 'TruthRatingAgent';
    this.version = '1.0.0';
    this.initialized = false;
    this.totalProcessed = 0;
    this.lastUsed = null;

    // Rating weights for different factors
    this.weights = {
      factCheckScore: 0.35,
      sourceCredibility: 0.25,
      communityVotes: 0.15,
      expertReviews: 0.15,
      historicalAccuracy: 0.10,
    };
  }

  async initialize() {
    console.log(`🤖 Initializing ${this.name}...`);
    this.initialized = true;
    return { status: 'ready', agent: this.name };
  }

  /**
   * Calculate truth rating for an app or claim
   * @param {Object} data - The data to rate (factChecks, reviews, sources, etc.)
   * @param {Object} options - Additional options
   * @returns {Object} Truth rating result
   */
  async process(data, options = {}) {
    if (!data) {
      throw new Error('No data provided for truth rating');
    }

    const {
      factChecks = [],
      sources = [],
      upvotes = 0,
      downvotes = 0,
      expertReviews = [],
      historicalData = null,
    } = data;

    // Calculate individual scores
    const factCheckScore = this.calculateFactCheckScore(factChecks);
    const sourceCredibility = this.calculateSourceCredibility(sources);
    const communityScore = this.calculateCommunityScore(upvotes, downvotes);
    const expertScore = this.calculateExpertScore(expertReviews);
    const historyScore = this.calculateHistoryScore(historicalData);

    // Weighted average
    const truthRating =
      factCheckScore * this.weights.factCheckScore +
      sourceCredibility * this.weights.sourceCredibility +
      communityScore * this.weights.communityVotes +
      expertScore * this.weights.expertReviews +
      historyScore * this.weights.historicalAccuracy;

    // Confidence calculation
    const confidence = this.calculateConfidence(data);

    // Rating category
    const category = this.categorizeRating(truthRating);

    this.totalProcessed++;
    this.lastUsed = new Date().toISOString();

    return {
      truthRating: Math.round(truthRating * 100) / 100, // Round to 2 decimals
      category,
      confidence,
      breakdown: {
        factCheckScore,
        sourceCredibility,
        communityScore,
        expertScore,
        historyScore,
      },
      weights: this.weights,
      recommendation: this.getRecommendation(truthRating, confidence),
      calculatedAt: new Date().toISOString(),
    };
  }

  /**
   * Calculate score from fact-checks
   */
  calculateFactCheckScore(factChecks) {
    if (factChecks.length === 0) return 0.5; // Neutral for no data

    const verdictScores = {
      true: 1.0,
      mostly_true: 0.8,
      mixed: 0.5,
      mostly_false: 0.2,
      false: 0.0,
      unverifiable: 0.5,
    };

    const totalScore = factChecks.reduce((sum, check) => {
      const baseScore = verdictScores[check.verdict] || 0.5;
      const confidenceWeight = check.confidenceScore || 0.5;
      return sum + baseScore * confidenceWeight;
    }, 0);

    return totalScore / factChecks.length;
  }

  /**
   * Calculate source credibility score
   */
  calculateSourceCredibility(sources) {
    if (sources.length === 0) return 0.5;

    const credibilityLevels = {
      high: 1.0,
      medium: 0.7,
      low: 0.3,
      unknown: 0.5,
    };

    const totalScore = sources.reduce((sum, source) => {
      const credibility = source.credibilityLevel || 'unknown';
      return sum + credibilityLevels[credibility];
    }, 0);

    return totalScore / sources.length;
  }

  /**
   * Calculate community voting score
   */
  calculateCommunityScore(upvotes, downvotes) {
    const total = upvotes + downvotes;
    if (total === 0) return 0.5;

    // Wilson score interval for better small-sample handling
    const p = upvotes / total;
    const z = 1.96; // 95% confidence
    const denominator = 1 + z * z / total;
    const score =
      (p + (z * z) / (2 * total) - z * Math.sqrt((p * (1 - p) + (z * z) / (4 * total)) / total)) /
      denominator;

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Calculate expert review score
   */
  calculateExpertScore(expertReviews) {
    if (expertReviews.length === 0) return 0.5;

    const totalScore = expertReviews.reduce((sum, review) => {
      const rating = review.rating || 0.5;
      const expertWeight = review.expertWeight || 1.0;
      return sum + rating * expertWeight;
    }, 0);

    const totalWeight = expertReviews.reduce((sum, review) => sum + (review.expertWeight || 1.0), 0);

    return totalScore / totalWeight;
  }

  /**
   * Calculate historical accuracy score
   */
  calculateHistoryScore(historicalData) {
    if (!historicalData) return 0.5;

    const { accuracyRate, totalClaims } = historicalData;

    if (!totalClaims || totalClaims < 5) return 0.5; // Not enough data

    return accuracyRate;
  }

  /**
   * Calculate overall confidence
   */
  calculateConfidence(data) {
    let confidence = 0;
    let factors = 0;

    if (data.factChecks && data.factChecks.length > 0) {
      confidence += 0.3;
      factors++;
    }

    if (data.sources && data.sources.length > 2) {
      confidence += 0.25;
      factors++;
    }

    const totalVotes = (data.upvotes || 0) + (data.downvotes || 0);
    if (totalVotes > 10) {
      confidence += 0.2;
      factors++;
    }

    if (data.expertReviews && data.expertReviews.length > 0) {
      confidence += 0.15;
      factors++;
    }

    if (data.historicalData && data.historicalData.totalClaims > 5) {
      confidence += 0.1;
      factors++;
    }

    return factors > 0 ? confidence : 0.3; // Minimum 30% confidence
  }

  /**
   * Categorize rating
   */
  categorizeRating(rating) {
    if (rating >= 0.9) return 'highly_reliable';
    if (rating >= 0.75) return 'reliable';
    if (rating >= 0.6) return 'mostly_reliable';
    if (rating >= 0.4) return 'mixed';
    if (rating >= 0.25) return 'mostly_unreliable';
    return 'unreliable';
  }

  /**
   * Get recommendation based on rating and confidence
   */
  getRecommendation(rating, confidence) {
    if (confidence < 0.4) {
      return 'requires_more_verification';
    }

    if (rating >= 0.75) return 'recommend';
    if (rating >= 0.5) return 'use_with_caution';
    return 'not_recommended';
  }

  async shutdown() {
    console.log(`🛑 Shutting down ${this.name}...`);
    this.initialized = false;
  }
}

module.exports = new TruthRatingAgent();
