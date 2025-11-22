// backend/agents/reviewAuthenticityAgent.js
// AI agent for verifying review authenticity and detecting fake reviews

class ReviewAuthenticityAgent {
  constructor() {
    this.name = 'ReviewAuthenticityAgent';
    this.version = '1.0.0';
    this.initialized = false;
    this.totalProcessed = 0;
    this.lastUsed = null;

    // Authenticity indicators
    this.fakeReviewIndicators = {
      generic_language: ['amazing', 'best ever', 'must have', 'life changing'],
      excessive_caps: 0.3,
      no_details: 50, // Min characters for detailed review
      perfect_rating_with_issues: true,
    };
  }

  async initialize() {
    console.log(`🤖 Initializing ${this.name}...`);
    this.initialized = true;
    return { status: 'ready', agent: this.name };
  }

  /**
   * Verify review authenticity
   * @param {Object} review - The review to verify
   * @param {Object} options - Verification options (user history, purchase verification, etc.)
   * @returns {Object} Authenticity verification result
   */
  async process(review, options = {}) {
    if (!review || !review.text) {
      throw new Error('Invalid review data');
    }

    const { userHistory = [], verifiedPurchase = false } = options;

    // Check various authenticity factors
    const languageCheck = this.checkLanguagePatterns(review.text);
    const detailCheck = this.checkDetailLevel(review.text);
    const consistencyCheck = this.checkConsistency(review, userHistory);
    const timingCheck = this.checkTiming(review, userHistory);
    const ratingCheck = this.checkRatingConsistency(review);

    // Calculate authenticity score
    const authenticityScore = this.calculateAuthenticityScore({
      languageCheck,
      detailCheck,
      consistencyCheck,
      timingCheck,
      ratingCheck,
      verifiedPurchase,
    });

    const isAuthentic = authenticityScore >= 0.6;
    const isSuspicious = authenticityScore < 0.4;

    this.totalProcessed++;
    this.lastUsed = new Date().toISOString();

    return {
      isAuthentic,
      isSuspicious,
      authenticityScore,
      confidence: this.calculateConfidence(options),
      checks: {
        language: languageCheck,
        detail: detailCheck,
        consistency: consistencyCheck,
        timing: timingCheck,
        rating: ratingCheck,
        verifiedPurchase,
      },
      flags: this.generateFlags(languageCheck, detailCheck, consistencyCheck, timingCheck, ratingCheck),
      recommendation: this.getRecommendation(authenticityScore, isSuspicious),
      verifiedAt: new Date().toISOString(),
    };
  }

  /**
   * Check language patterns for fake review indicators
   */
  checkLanguagePatterns(text) {
    const lowerText = text.toLowerCase();
    let suspicionScore = 0;
    const flags = [];

    // Check for generic language
    let genericCount = 0;
    this.fakeReviewIndicators.generic_language.forEach(phrase => {
      if (lowerText.includes(phrase)) {
        genericCount++;
      }
    });

    if (genericCount >= 2) {
      suspicionScore += 0.3;
      flags.push('excessive_generic_language');
    }

    // Check caps ratio
    const capsCount = (text.match(/[A-Z]/g) || []).length;
    const capsRatio = capsCount / text.length;

    if (capsRatio > this.fakeReviewIndicators.excessive_caps) {
      suspicionScore += 0.2;
      flags.push('excessive_caps');
    }

    // Check for promotional language
    if (/\b(buy|discount|coupon|promo|deal)\b/i.test(text)) {
      suspicionScore += 0.3;
      flags.push('promotional_content');
    }

    // Check for external links
    if (/https?:\/\//i.test(text)) {
      suspicionScore += 0.4;
      flags.push('contains_links');
    }

    return {
      suspicionScore: Math.min(suspicionScore, 1),
      flags,
      passed: suspicionScore < 0.5,
    };
  }

  /**
   * Check detail level in review
   */
  checkDetailLevel(text) {
    const wordCount = text.split(/\s+/).length;
    const hasSpecifics = /\b(feature|function|interface|performance|speed|quality)\b/i.test(text);

    let score = 0;

    // Detailed reviews are more authentic
    if (wordCount >= 100) score += 0.4;
    else if (wordCount >= 50) score += 0.3;
    else if (wordCount >= 20) score += 0.2;
    else score += 0.1;

    if (hasSpecifics) score += 0.3;

    return {
      score,
      wordCount,
      hasSpecifics,
      passed: score >= 0.4,
    };
  }

  /**
   * Check consistency with user's review history
   */
  checkConsistency(review, userHistory) {
    if (userHistory.length === 0) {
      return { score: 0.5, consistent: true, reason: 'no_history' };
    }

    // Check rating consistency
    const avgPreviousRating = userHistory.reduce((sum, r) => sum + r.rating, 0) / userHistory.length;
    const ratingDiff = Math.abs(review.rating - avgPreviousRating);

    // Check writing style consistency (simplified)
    const avgPreviousLength = userHistory.reduce((sum, r) => sum + r.text.length, 0) / userHistory.length;
    const lengthDiff = Math.abs(review.text.length - avgPreviousLength);

    let score = 1.0;

    // Large deviation is suspicious
    if (ratingDiff > 3) score -= 0.3;
    if (lengthDiff > avgPreviousLength * 2) score -= 0.2;

    return {
      score: Math.max(score, 0),
      consistent: score >= 0.6,
      ratingDiff,
      lengthDiff,
    };
  }

  /**
   * Check review timing patterns
   */
  checkTiming(review, userHistory) {
    if (userHistory.length === 0) {
      return { score: 0.5, suspicious: false, reason: 'no_history' };
    }

    const reviewTime = new Date(review.createdAt).getTime();

    // Check for burst reviewing (multiple reviews in short time)
    const recentReviews = userHistory.filter(r => {
      const time = new Date(r.createdAt).getTime();
      return Math.abs(reviewTime - time) < 60 * 60 * 1000; // Within 1 hour
    });

    const isBurst = recentReviews.length > 3;

    // Check for unusual timing (e.g., reviewing at 3 AM consistently)
    const reviewHour = new Date(review.createdAt).getHours();
    const isUnusualHour = reviewHour >= 2 && reviewHour <= 5;

    let score = 1.0;

    if (isBurst) score -= 0.5;
    if (isUnusualHour) score -= 0.2;

    return {
      score: Math.max(score, 0),
      suspicious: score < 0.5,
      isBurst,
      isUnusualHour,
    };
  }

  /**
   * Check rating consistency with review text sentiment
   */
  checkRatingConsistency(review) {
    const { rating, text } = review;
    const lowerText = text.toLowerCase();

    // Simple sentiment detection
    const positiveWords = ['good', 'great', 'excellent', 'love', 'amazing', 'wonderful', 'perfect'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'worst', 'horrible', 'disappointing'];

    const positiveCount = positiveWords.filter(w => lowerText.includes(w)).length;
    const negativeCount = negativeWords.filter(w => lowerText.includes(w)).length;

    // High rating should have positive sentiment
    const shouldBePositive = rating >= 4;
    const shouldBeNegative = rating <= 2;

    let consistent = true;

    if (shouldBePositive && negativeCount > positiveCount) consistent = false;
    if (shouldBeNegative && positiveCount > negativeCount) consistent = false;

    return {
      consistent,
      positiveCount,
      negativeCount,
      rating,
      passed: consistent,
    };
  }

  /**
   * Calculate overall authenticity score
   */
  calculateAuthenticityScore(checks) {
    const weights = {
      languageCheck: 0.25,
      detailCheck: 0.20,
      consistencyCheck: 0.20,
      timingCheck: 0.15,
      ratingCheck: 0.15,
      verifiedPurchase: 0.05,
    };

    let score = 0;

    // Language check (inverse of suspicion)
    score += (1 - checks.languageCheck.suspicionScore) * weights.languageCheck;

    // Detail check
    score += checks.detailCheck.score * weights.detailCheck;

    // Consistency check
    score += checks.consistencyCheck.score * weights.consistencyCheck;

    // Timing check
    score += checks.timingCheck.score * weights.timingCheck;

    // Rating check
    score += (checks.ratingCheck.consistent ? 1 : 0) * weights.ratingCheck;

    // Verified purchase bonus
    score += (checks.verifiedPurchase ? 1 : 0.5) * weights.verifiedPurchase;

    return Math.min(Math.max(score, 0), 1);
  }

  /**
   * Calculate confidence in authenticity assessment
   */
  calculateConfidence(options) {
    let confidence = 0.5; // Base confidence

    if (options.verifiedPurchase) confidence += 0.3;
    if (options.userHistory && options.userHistory.length > 5) confidence += 0.2;

    return Math.min(confidence, 1);
  }

  /**
   * Generate authenticity flags
   */
  generateFlags(...checks) {
    const allFlags = [];

    checks.forEach(check => {
      if (check && check.flags) {
        allFlags.push(...check.flags);
      }
    });

    return allFlags;
  }

  /**
   * Get recommendation
   */
  getRecommendation(authenticityScore, isSuspicious) {
    if (isSuspicious) return 'flag_for_review';
    if (authenticityScore < 0.6) return 'verify_manually';
    if (authenticityScore >= 0.8) return 'approve';
    return 'acceptable';
  }

  async shutdown() {
    console.log(`🛑 Shutting down ${this.name}...`);
    this.initialized = false;
  }
}

module.exports = new ReviewAuthenticityAgent();
