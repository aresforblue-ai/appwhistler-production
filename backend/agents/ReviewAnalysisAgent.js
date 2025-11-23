// Review Analysis Agent - Detects fake reviews, paid endorsements, and bias
// This is the HIGHEST PRIORITY agent for truth verification

const BaseAgent = require('./BaseAgent');

class ReviewAnalysisAgent extends BaseAgent {
  constructor() {
    super('ReviewAnalysisAgent', '2.0');

    // Fake review indicators and weights
    this.indicators = {
      generic_language: 0.25,
      new_account: 0.20,
      timing_cluster: 0.20,
      sponsored_keywords: 0.15,
      profile_authenticity: 0.10,
      review_detail: 0.10
    };

    // Generic phrases that indicate fake reviews
    this.genericPhrases = [
      'life changing',
      'best app ever',
      'must have',
      'game changer',
      'highly recommend',
      'amazing app',
      'perfect app',
      'exactly what I needed',
      'works great',
      'love it',
      'awesome',
      '5 stars'
    ];

    // Sponsored content keywords
    this.sponsoredKeywords = [
      'i was paid',
      'sponsored',
      '#ad',
      '#sponsored',
      'affiliate',
      'promo code',
      'discount code',
      'free trial',
      'compensation',
      'partnership'
    ];
  }

  /**
   * Main execution - analyze all reviews for an app
   * @param {Object} context - {appId, pool}
   * @returns {Promise<Object>} - Analysis results
   */
  async execute(context) {
    const { appId, pool } = context;

    this.log('info', `Analyzing reviews for app ${appId}...`);

    // Fetch all reviews for this app
    const reviews = await this.fetchReviews(pool, appId);

    if (reviews.length === 0) {
      this.log('warn', `No reviews found for app ${appId}`);
      return this.generateEmptyAnalysis();
    }

    this.log('info', `Found ${reviews.length} reviews to analyze`);

    // Analyze each review
    const analyzedReviews = [];
    let authenticCount = 0;
    let suspiciousCount = 0;
    let paidCount = 0;

    for (let i = 0; i < reviews.length; i++) {
      this.updateProgress((i / reviews.length) * 90); // 0-90% for review analysis

      const analysis = await this.analyzeReview(reviews[i]);
      analyzedReviews.push(analysis);

      if (analysis.authentic_score >= 70) {
        authenticCount++;
      } else {
        suspiciousCount++;
      }

      if (analysis.is_paid_endorsement) {
        paidCount++;
      }

      // Save individual review analysis
      await this.saveReviewAuthenticity(pool, analysis);
    }

    // Calculate aggregate statistics
    const aggregateAnalysis = this.calculateAggregateAnalysis(analyzedReviews);

    this.updateProgress(95);

    // Detect bias indicators
    const biasIndicators = this.detectBiasIndicators(reviews, analyzedReviews);

    // Calculate overall review authenticity score
    const authenticityScore = this.calculateAuthenticityScore(
      analyzedReviews,
      biasIndicators
    );

    this.updateProgress(100);

    return {
      authenticity_score: authenticityScore,
      total_reviews_analyzed: reviews.length,
      authentic_reviews: authenticCount,
      suspicious_reviews: suspiciousCount,
      paid_endorsements_detected: paidCount,
      bias_indicators: biasIndicators,
      flagged_reviews: analyzedReviews.filter(r => r.is_likely_fake || r.is_paid_endorsement),
      authentic_sentiment: aggregateAnalysis.sentiment,
      detailed_analysis: aggregateAnalysis
    };
  }

  /**
   * Fetch all reviews for an app
   * @param {Object} pool - Database pool
   * @param {string} appId - App ID
   * @returns {Promise<Array>} - Array of reviews
   */
  async fetchReviews(pool, appId) {
    const result = await pool.query(
      `SELECT r.*, u.username, u.created_at as user_created_at
       FROM reviews r
       JOIN users u ON r.user_id = u.id
       WHERE r.app_id = $1
       ORDER BY r.created_at DESC`,
      [appId]
    );

    return result.rows;
  }

  /**
   * Analyze a single review for authenticity
   * @param {Object} review - Review object
   * @returns {Object} - Analysis result
   */
  async analyzeReview(review) {
    const indicators = {};
    let scoreSum = 0;
    let weightSum = 0;

    // 1. Check for generic language
    const genericScore = this.checkGenericLanguage(review.review_text || '');
    indicators.generic_language = genericScore < 50;
    scoreSum += genericScore * this.indicators.generic_language;
    weightSum += this.indicators.generic_language;

    // 2. Check account age
    const accountAge = this.calculateAccountAge(review.user_created_at);
    const accountScore = this.scoreAccountAge(accountAge);
    indicators.new_account = accountAge < 7; // Less than 7 days
    indicators.account_age_days = accountAge;
    scoreSum += accountScore * this.indicators.new_account;
    weightSum += this.indicators.new_account;

    // 3. Check review detail/quality
    const detailScore = this.scoreReviewDetail(review.review_text || '');
    indicators.review_detail_score = detailScore;
    scoreSum += detailScore * this.indicators.review_detail;
    weightSum += this.indicators.review_detail;

    // 4. Check for sponsored keywords
    const paidScore = this.checkSponsoredContent(review.review_text || '');
    const isPaid = paidScore < 30;
    indicators.sponsored_keywords = isPaid;
    scoreSum += paidScore * this.indicators.sponsored_keywords;
    weightSum += this.indicators.sponsored_keywords;

    // 5. Language naturalness (simple heuristic)
    const naturalnessScore = this.scoreLa nguageNaturalness(review.review_text || '');
    indicators.language_naturalness = naturalnessScore / 100;
    scoreSum += naturalnessScore * 0.10;
    weightSum += 0.10;

    // Calculate weighted authenticity score
    const authenticityScore = Math.round((scoreSum / weightSum));

    // Determine if likely fake
    const isLikelyFake = authenticityScore < 50;

    // Check for bias
    const hasBias = this.checkBias(review);

    return {
      review_id: review.id,
      authentic_score: authenticityScore,
      is_likely_fake: isLikelyFake,
      is_paid_endorsement: isPaid,
      has_bias_indicators: hasBias,
      indicators,
      evidence_summary: this.generateEvidenceSummary(indicators, authenticityScore),
      flagged_reason: isLikelyFake ? this.generateFlagReason(indicators) : null
    };
  }

  /**
   * Check for generic/templated language
   * @param {string} text - Review text
   * @returns {number} - Score (0-100, lower = more generic)
   */
  checkGenericLanguage(text) {
    if (!text || text.length < 10) {
      return 20; // Very short reviews are suspicious
    }

    const lowerText = text.toLowerCase();
    let genericCount = 0;

    // Count generic phrases
    for (const phrase of this.genericPhrases) {
      if (lowerText.includes(phrase)) {
        genericCount++;
      }
    }

    // High generic phrase count = low score
    const genericRatio = genericCount / Math.max(1, text.split(' ').length / 10);
    const score = Math.max(0, 100 - (genericRatio * 100));

    return score;
  }

  /**
   * Calculate account age in days
   * @param {Date} createdAt - User account creation date
   * @returns {number} - Age in days
   */
  calculateAccountAge(createdAt) {
    const now = new Date();
    const accountDate = new Date(createdAt);
    const diffMs = now - accountDate;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  /**
   * Score account age (older = more trustworthy)
   * @param {number} ageInDays - Account age in days
   * @returns {number} - Score (0-100)
   */
  scoreAccountAge(ageInDays) {
    if (ageInDays < 7) return 20;
    if (ageInDays < 30) return 50;
    if (ageInDays < 90) return 70;
    if (ageInDays < 365) return 85;
    return 100; // 1+ years
  }

  /**
   * Score review detail and specificity
   * @param {string} text - Review text
   * @returns {number} - Score (0-100)
   */
  scoreReviewDetail(text) {
    if (!text) return 0;

    let score = 50; // Base score

    // Length bonus (detailed reviews are better)
    const wordCount = text.split(/\s+/).length;
    if (wordCount > 50) score += 20;
    else if (wordCount > 20) score += 10;
    else if (wordCount < 5) score -= 30;

    // Specific details bonus
    const hasSpecifics = /feature|function|ui|ux|interface|performance|bug|crash|privacy|data/i.test(text);
    if (hasSpecifics) score += 15;

    // Personal experience indicators
    const hasPersonalExperience = /i tried|i used|i found|i noticed|my experience|when i/i.test(text);
    if (hasPersonalExperience) score += 15;

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Check for sponsored content indicators
   * @param {string} text - Review text
   * @returns {number} - Score (0-100, lower = more likely sponsored)
   */
  checkSponsoredContent(text) {
    if (!text) return 100;

    const lowerText = text.toLowerCase();
    let sponsoredScore = 100;

    for (const keyword of this.sponsoredKeywords) {
      if (lowerText.includes(keyword)) {
        sponsoredScore -= 30; // Heavy penalty for sponsored keywords
      }
    }

    // Check for promo code patterns
    if (/code:?\s*[A-Z0-9]{4,}/i.test(text)) {
      sponsoredScore -= 25;
    }

    // Check for affiliate link patterns
    if (/https?:\/\/.*(?:ref|aff|affiliate)=/i.test(text)) {
      sponsoredScore -= 30;
    }

    return Math.max(0, sponsoredScore);
  }

  /**
   * Score language naturalness (simple heuristic)
   * @param {string} text - Review text
   * @returns {number} - Score (0-100)
   */
  scoreLa nguageNaturalness(text) {
    if (!text) return 0;

    let score = 50;

    // Check for repeated words/phrases (bot pattern)
    const words = text.toLowerCase().split(/\s+/);
    const uniqueWords = new Set(words);
    const repetitionRatio = uniqueWords.size / words.length;

    if (repetitionRatio < 0.5) score -= 30; // High repetition
    else if (repetitionRatio > 0.8) score += 20; // Good diversity

    // Check for excessive punctuation (!!!, ???, etc.)
    const excessivePunctuation = /([!?]){3,}/g;
    if (excessivePunctuation.test(text)) score -= 15;

    // Check for all caps (shouting)
    const capsRatio = (text.match(/[A-Z]/g) || []).length / text.length;
    if (capsRatio > 0.5) score -= 20;

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Check for bias indicators
   * @param {Object} review - Review object
   * @returns {boolean} - Has bias indicators
   */
  checkBias(review) {
    // Check for employee reviews (would need additional data)
    // Check for competitor bashing
    const text = (review.review_text || '').toLowerCase();

    const competitorBashing = /competitor|alternative|other apps|switch from|compared to/i.test(text);
    const extremeRating = review.rating === 1 || review.rating === 5;

    return competitorBashing && extremeRating;
  }

  /**
   * Generate evidence summary
   * @param {Object} indicators - Analysis indicators
   * @param {number} score - Authenticity score
   * @returns {string} - Evidence summary
   */
  generateEvidenceSummary(indicators, score) {
    const evidence = [];

    if (indicators.generic_language) {
      evidence.push('Generic/templated language detected');
    }

    if (indicators.new_account) {
      evidence.push(`New account (${indicators.account_age_days} days old)`);
    }

    if (indicators.sponsored_keywords) {
      evidence.push('Sponsored content keywords found');
    }

    if (indicators.review_detail_score < 40) {
      evidence.push('Lacks specific details');
    }

    if (evidence.length === 0) {
      return 'No suspicious indicators detected';
    }

    return evidence.join('; ');
  }

  /**
   * Generate flag reason
   * @param {Object} indicators - Analysis indicators
   * @returns {string} - Flag reason
   */
  generateFlagReason(indicators) {
    const reasons = [];

    if (indicators.generic_language && indicators.new_account) {
      reasons.push('Generic language + new account');
    } else if (indicators.generic_language) {
      reasons.push('Generic/templated language');
    } else if (indicators.new_account) {
      reasons.push('Suspiciously new account');
    }

    if (indicators.sponsored_keywords) {
      reasons.push('Paid endorsement indicators');
    }

    if (indicators.review_detail_score < 30) {
      reasons.push('Extremely low detail');
    }

    return reasons.join(' + ') || 'Multiple suspicious indicators';
  }

  /**
   * Calculate aggregate analysis across all reviews
   * @param {Array} analyzedReviews - Array of analyzed reviews
   * @returns {Object} - Aggregate statistics
   */
  calculateAggregateAnalysis(analyzedReviews) {
    const authenticReviews = analyzedReviews.filter(r => r.authentic_score >= 70);

    // Calculate sentiment from authentic reviews only
    // (Would integrate with sentiment analysis API in production)
    const sentiment = {
      positive: Math.round(authenticReviews.length * 0.67),
      neutral: Math.round(authenticReviews.length * 0.25),
      negative: Math.round(authenticReviews.length * 0.08)
    };

    return {
      sentiment,
      average_authenticity_score: Math.round(
        analyzedReviews.reduce((sum, r) => sum + r.authentic_score, 0) / analyzedReviews.length
      )
    };
  }

  /**
   * Detect bias indicators across all reviews
   * @param {Array} reviews - Original reviews
   * @param {Array} analyzedReviews - Analyzed reviews
   * @returns {Object} - Bias indicators
   */
  detectBiasIndicators(reviews, analyzedReviews) {
    // Check for review timing clusters (suspicious bursts)
    const timingCluster = this.detectTimingClusters(reviews);

    // Check for astroturfing (organized fake review campaigns)
    const astroturfing = this.detectAstroturfing(analyzedReviews);

    return {
      astroturfing_likelihood: astroturfing,
      timing_cluster_detected: timingCluster,
      competitor_bombing: false, // Would need more sophisticated analysis
      employee_reviews: 0 // Would need employee data
    };
  }

  /**
   * Detect suspicious timing clusters
   * @param {Array} reviews - Reviews array
   * @returns {boolean} - Timing cluster detected
   */
  detectTimingClusters(reviews) {
    if (reviews.length < 10) return false;

    // Check for >50 reviews in 24 hours (suspicious burst)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentReviews = reviews.filter(r => new Date(r.created_at) > oneDayAgo);

    return recentReviews.length > 50;
  }

  /**
   * Detect astroturfing campaigns
   * @param {Array} analyzedReviews - Analyzed reviews
   * @returns {number} - Astroturfing likelihood (0-1)
   */
  detectAstroturfing(analyzedReviews) {
    if (analyzedReviews.length < 20) return 0;

    // High percentage of fake reviews + new accounts = likely astroturfing
    const fakeCount = analyzedReviews.filter(r => r.is_likely_fake).length;
    const fakeRatio = fakeCount / analyzedReviews.length;

    const newAccountCount = analyzedReviews.filter(r => r.indicators.new_account).length;
    const newAccountRatio = newAccountCount / analyzedReviews.length;

    // Combined score
    const astroturfingLikelihood = (fakeRatio * 0.6 + newAccountRatio * 0.4);

    return Math.min(1, astroturfingLikelihood);
  }

  /**
   * Calculate overall review authenticity score for the app
   * @param {Array} analyzedReviews - Analyzed reviews
   * @param {Object} biasIndicators - Bias indicators
   * @returns {number} - Authenticity score (0-100)
   */
  calculateAuthenticityScore(analyzedReviews, biasIndicators) {
    if (analyzedReviews.length === 0) return 0;

    // Start with average authenticity
    const avgAuthenticity = analyzedReviews.reduce((sum, r) => sum + r.authentic_score, 0) / analyzedReviews.length;

    let score = avgAuthenticity;

    // Penalties for bias indicators
    if (biasIndicators.astroturfing_likelihood > 0.5) {
      score -= 30;
    } else if (biasIndicators.astroturfing_likelihood > 0.25) {
      score -= 15;
    }

    if (biasIndicators.timing_cluster_detected) {
      score -= 10;
    }

    return Math.round(Math.min(100, Math.max(0, score)));
  }

  /**
   * Save review authenticity analysis to database
   * @param {Object} pool - Database pool
   * @param {Object} analysis - Review analysis result
   * @returns {Promise<Object>} - Saved record
   */
  async saveReviewAuthenticity(pool, analysis) {
    try {
      const result = await pool.query(
        `INSERT INTO review_authenticity
         (review_id, authenticity_score, is_likely_fake, is_paid_endorsement,
          has_bias_indicators, indicators, evidence_summary, flagged_reason, analyzed_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
         ON CONFLICT (review_id)
         DO UPDATE SET
           authenticity_score = $2,
           is_likely_fake = $3,
           is_paid_endorsement = $4,
           has_bias_indicators = $5,
           indicators = $6,
           evidence_summary = $7,
           flagged_reason = $8,
           analyzed_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [
          analysis.review_id,
          analysis.authentic_score,
          analysis.is_likely_fake,
          analysis.is_paid_endorsement,
          analysis.has_bias_indicators,
          JSON.stringify(analysis.indicators),
          analysis.evidence_summary,
          analysis.flagged_reason
        ]
      );

      return result.rows[0];
    } catch (error) {
      // Table might not exist yet
      this.log('warn', `Could not save review authenticity: ${error.message}`);
      return analysis;
    }
  }

  /**
   * Generate empty analysis for apps with no reviews
   * @returns {Object} - Empty analysis
   */
  generateEmptyAnalysis() {
    return {
      authenticity_score: 0,
      total_reviews_analyzed: 0,
      authentic_reviews: 0,
      suspicious_reviews: 0,
      paid_endorsements_detected: 0,
      bias_indicators: {
        astroturfing_likelihood: 0,
        timing_cluster_detected: false,
        competitor_bombing: false,
        employee_reviews: 0
      },
      flagged_reviews: [],
      authentic_sentiment: {
        positive: 0,
        neutral: 0,
        negative: 0
      },
      detailed_analysis: {
        sentiment: { positive: 0, neutral: 0, negative: 0 },
        average_authenticity_score: 0
      }
    };
  }
}

module.exports = ReviewAnalysisAgent;
