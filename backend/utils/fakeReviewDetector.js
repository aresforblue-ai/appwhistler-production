/**
 * AppWhistler Fake Review Detection Engine
 * Multi-layer analysis system for detecting astroturfing, bot reviews, and coordinated campaigns
 *
 * Detection Layers:
 * 1. Pattern Analysis - Timing, bursts, coordination
 * 2. NLP Analysis - Bot-generated text, templates
 * 3. Behavioral Signals - Account age, posting patterns
 * 4. Graph Analysis - Review networks, campaigns
 * 5. ML Scoring - Weighted confidence score
 */

const natural = require('natural'); // For NLP (install: npm i natural)

// ============================================================================
// Layer 1: Pattern Analysis
// ============================================================================

/**
 * Detect suspicious timing patterns in reviews
 */
function analyzeTimingPatterns(reviews) {
  const signals = {
    suspiciousBursts: false,
    coordinatedTiming: false,
    abnormalVelocity: false,
    confidence: 0
  };

  if (reviews.length < 3) return signals;

  // Sort by timestamp
  const sorted = reviews.sort((a, b) =>
    new Date(a.created_at) - new Date(b.created_at)
  );

  // Check for review bursts (10+ reviews within 1 hour)
  const timestamps = sorted.map(r => new Date(r.created_at).getTime());

  for (let i = 0; i < timestamps.length - 9; i++) {
    const windowSize = timestamps[i + 9] - timestamps[i];
    const oneHour = 60 * 60 * 1000;

    if (windowSize < oneHour) {
      signals.suspiciousBursts = true;
      signals.confidence += 30;
      break;
    }
  }

  // Check for coordinated timing (reviews posted at exact same minute)
  const minuteGroups = {};
  timestamps.forEach(ts => {
    const minute = Math.floor(ts / 60000); // Round to minute
    minuteGroups[minute] = (minuteGroups[minute] || 0) + 1;
  });

  const maxSameMinute = Math.max(...Object.values(minuteGroups));
  if (maxSameMinute >= 5) {
    signals.coordinatedTiming = true;
    signals.confidence += 25;
  }

  // Check for abnormal velocity (100+ reviews in 24 hours)
  const last24h = Date.now() - (24 * 60 * 60 * 1000);
  const recentReviews = timestamps.filter(ts => ts > last24h);

  if (recentReviews.length > 100) {
    signals.abnormalVelocity = true;
    signals.confidence += 20;
  }

  return signals;
}

/**
 * Detect rating manipulation (sudden shifts, unnatural distributions)
 */
function analyzeRatingDistribution(reviews) {
  const signals = {
    unnaturalDistribution: false,
    polarization: false,
    recentManipulation: false,
    confidence: 0
  };

  if (reviews.length < 10) return signals;

  const ratings = reviews.map(r => r.rating);
  const avgRating = ratings.reduce((a, b) => a + b, 0) / ratings.length;

  // Check for unnatural 5-star concentration (>80% are 5-star)
  const fiveStars = ratings.filter(r => r === 5).length;
  const fiveStarRatio = fiveStars / ratings.length;

  if (fiveStarRatio > 0.8) {
    signals.unnaturalDistribution = true;
    signals.confidence += 25;
  }

  // Check for polarization (mostly 1-star or 5-star, few in middle)
  const extremes = ratings.filter(r => r === 1 || r === 5).length;
  const extremeRatio = extremes / ratings.length;

  if (extremeRatio > 0.75) {
    signals.polarization = true;
    signals.confidence += 20;
  }

  // Check for recent manipulation (last 20 reviews are all 5-star)
  const recent20 = reviews.slice(-20);
  const recent5Stars = recent20.filter(r => r.rating === 5).length;

  if (recent5Stars === 20) {
    signals.recentManipulation = true;
    signals.confidence += 30;
  }

  return signals;
}

// ============================================================================
// Layer 2: NLP Analysis (Bot Detection)
// ============================================================================

/**
 * Detect bot-generated review text using NLP
 */
function analyzeReviewText(reviewText) {
  const signals = {
    isTemplate: false,
    isGPTGenerated: false,
    isCopypasta: false,
    hasSpamKeywords: false,
    confidence: 0
  };

  if (!reviewText || reviewText.length < 10) {
    signals.confidence = 50; // Suspiciously short
    return signals;
  }

  const text = reviewText.toLowerCase();

  // GPT-generated text patterns (overly formal, generic praise)
  const gptPatterns = [
    /as an? (ai|bot|user|customer)/i,
    /i (recently|highly) recommend/i,
    /this app (truly|really|definitely) (stands out|exceeds)/i,
    /the (interface|design|experience) is (intuitive|seamless|user-friendly)/i,
    /overall,? i('m| am) (impressed|satisfied|pleased)/i,
    /in conclusion/i,
    /highly recommended? for (anyone|everyone)/i
  ];

  const gptMatches = gptPatterns.filter(pattern => pattern.test(text)).length;
  if (gptMatches >= 2) {
    signals.isGPTGenerated = true;
    signals.confidence += 35;
  }

  // Template detection (repetitive phrases)
  const templatePhrases = [
    'great app',
    'highly recommend',
    'easy to use',
    'must have',
    'works perfectly',
    'love it',
    '5 stars',
    'best app ever'
  ];

  const templateMatches = templatePhrases.filter(phrase =>
    text.includes(phrase)
  ).length;

  if (templateMatches >= 3) {
    signals.isTemplate = true;
    signals.confidence += 25;
  }

  // Spam keyword detection
  const spamKeywords = [
    'click here',
    'download now',
    'limited time',
    'free gift',
    'promo code',
    'discount',
    'coupon',
    'http://',
    'https://',
    'bit.ly'
  ];

  if (spamKeywords.some(keyword => text.includes(keyword))) {
    signals.hasSpamKeywords = true;
    signals.confidence += 40;
  }

  return signals;
}

/**
 * Detect duplicate/near-duplicate reviews (copypasta)
 */
function detectDuplicates(reviews) {
  const signals = {
    exactDuplicates: 0,
    nearDuplicates: 0,
    confidence: 0
  };

  if (reviews.length < 2) return signals;

  // Tokenize and compare reviews
  const tokenizer = new natural.WordTokenizer();
  const reviewTexts = reviews.map(r => r.review_text || '').filter(Boolean);

  for (let i = 0; i < reviewTexts.length; i++) {
    for (let j = i + 1; j < reviewTexts.length; j++) {
      const text1 = reviewTexts[i].toLowerCase();
      const text2 = reviewTexts[j].toLowerCase();

      // Exact duplicates
      if (text1 === text2) {
        signals.exactDuplicates++;
        signals.confidence += 15;
        continue;
      }

      // Near-duplicates (>85% similar using Jaccard similarity)
      const tokens1 = new Set(tokenizer.tokenize(text1));
      const tokens2 = new Set(tokenizer.tokenize(text2));

      const intersection = new Set([...tokens1].filter(x => tokens2.has(x)));
      const union = new Set([...tokens1, ...tokens2]);

      const similarity = intersection.size / union.size;

      if (similarity > 0.85) {
        signals.nearDuplicates++;
        signals.confidence += 10;
      }
    }
  }

  // Cap confidence (don't let duplicates alone reach 100%)
  signals.confidence = Math.min(signals.confidence, 60);

  return signals;
}

// ============================================================================
// Layer 3: Behavioral Signals
// ============================================================================

/**
 * Analyze user behavior patterns
 */
function analyzeUserBehavior(review, userHistory = {}) {
  const signals = {
    newAccountSpam: false,
    bulkReviewer: false,
    singlePurposeAccount: false,
    confidence: 0
  };

  // Check account age vs review timing
  const accountCreated = userHistory.created_at ? new Date(userHistory.created_at) : null;
  const reviewCreated = new Date(review.created_at);

  if (accountCreated) {
    const accountAgeHours = (reviewCreated - accountCreated) / (1000 * 60 * 60);

    // Account created <24 hours before review
    if (accountAgeHours < 24) {
      signals.newAccountSpam = true;
      signals.confidence += 30;
    }
  }

  // Check if user is bulk reviewer (50+ reviews total)
  if (userHistory.total_reviews > 50) {
    signals.bulkReviewer = true;
    signals.confidence += 15;
  }

  // Check if account only reviews one app (suspicious for paid reviews)
  if (userHistory.reviewed_apps && userHistory.reviewed_apps.length === 1) {
    signals.singlePurposeAccount = true;
    signals.confidence += 20;
  }

  return signals;
}

// ============================================================================
// Layer 4: Graph Analysis (Network Detection)
// ============================================================================

/**
 * Detect coordinated review campaigns using graph analysis
 */
function detectReviewNetworks(reviews) {
  const signals = {
    coordinatedCampaign: false,
    clusterDetected: false,
    confidence: 0
  };

  if (reviews.length < 10) return signals;

  // Build user-to-user similarity graph
  const userIds = [...new Set(reviews.map(r => r.user_id))];

  // Check for users reviewing at similar times with similar text
  const clusters = [];

  for (const userId of userIds) {
    const userReviews = reviews.filter(r => r.user_id === userId);

    // If user posted multiple reviews within short timeframe
    if (userReviews.length > 1) {
      const times = userReviews.map(r => new Date(r.created_at).getTime());
      const maxDiff = Math.max(...times) - Math.min(...times);
      const oneDay = 24 * 60 * 60 * 1000;

      if (maxDiff < oneDay) {
        clusters.push(userId);
      }
    }
  }

  // If >10% of users are clustered, likely a campaign
  const clusterRatio = clusters.length / userIds.length;

  if (clusterRatio > 0.1) {
    signals.coordinatedCampaign = true;
    signals.confidence += 30;
  }

  // Check for identical IP patterns (requires IP data)
  // This would require storing review IP hashes
  // Placeholder for future implementation

  return signals;
}

// ============================================================================
// Layer 5: ML-Based Scoring
// ============================================================================

/**
 * Combine all signals into weighted confidence score
 */
function calculateFakeReviewScore(allSignals) {
  const {
    timing,
    rating,
    text,
    duplicates,
    behavior,
    network
  } = allSignals;

  // Weighted scoring (max 100)
  let totalScore = 0;
  let maxScore = 0;

  // Layer weights
  const weights = {
    timing: 0.20,      // 20% - Timing patterns
    rating: 0.15,      // 15% - Rating distribution
    text: 0.25,        // 25% - NLP analysis (most important)
    duplicates: 0.20,  // 20% - Duplicate detection
    behavior: 0.15,    // 15% - User behavior
    network: 0.05      // 5% - Network analysis
  };

  totalScore += timing.confidence * weights.timing;
  totalScore += rating.confidence * weights.rating;
  totalScore += text.confidence * weights.text;
  totalScore += duplicates.confidence * weights.duplicates;
  totalScore += behavior.confidence * weights.behavior;
  totalScore += network.confidence * weights.network;

  // Normalize to 0-100
  const normalizedScore = Math.min(Math.round(totalScore), 100);

  return {
    score: normalizedScore,
    verdict: getVerdict(normalizedScore),
    breakdown: {
      timingPatterns: timing.confidence,
      ratingManipulation: rating.confidence,
      textAnalysis: text.confidence,
      duplicateDetection: duplicates.confidence,
      userBehavior: behavior.confidence,
      networkAnalysis: network.confidence
    }
  };
}

/**
 * Get human-readable verdict based on score
 */
function getVerdict(score) {
  if (score >= 80) return 'HIGHLY_LIKELY_FAKE';
  if (score >= 60) return 'LIKELY_FAKE';
  if (score >= 40) return 'SUSPICIOUS';
  if (score >= 20) return 'POTENTIALLY_SUSPICIOUS';
  return 'LIKELY_GENUINE';
}

// ============================================================================
// Main Analysis Function
// ============================================================================

/**
 * Analyze a single review for fake signals
 */
async function analyzeSingleReview(review, context = {}) {
  const { allReviews = [], userHistory = {} } = context;

  const signals = {
    text: analyzeReviewText(review.review_text),
    behavior: analyzeUserBehavior(review, userHistory)
  };

  // Calculate individual score (without network context)
  const score = Math.round(
    (signals.text.confidence * 0.6 + signals.behavior.confidence * 0.4)
  );

  return {
    reviewId: review.id,
    fakeScore: score,
    verdict: getVerdict(score),
    signals: {
      textAnalysis: signals.text,
      behaviorAnalysis: signals.behavior
    },
    redFlags: generateRedFlags(signals, score)
  };
}

/**
 * Analyze all reviews for an app (full network analysis)
 */
async function analyzeAppReviews(appId, reviews) {
  if (!reviews || reviews.length === 0) {
    return {
      appId,
      overallFakeScore: 0,
      verdict: 'INSUFFICIENT_DATA',
      totalReviews: 0,
      suspiciousReviews: 0,
      analysis: null
    };
  }

  // Run all detection layers
  const signals = {
    timing: analyzeTimingPatterns(reviews),
    rating: analyzeRatingDistribution(reviews),
    text: analyzeMultipleReviews(reviews),
    duplicates: detectDuplicates(reviews),
    network: detectReviewNetworks(reviews),
    behavior: { confidence: 0 } // Will be averaged from individual reviews
  };

  // Calculate overall score
  const overallScore = calculateFakeReviewScore(signals);

  // Count suspicious reviews (individual analysis)
  let suspiciousCount = 0;
  const individualAnalyses = [];

  for (const review of reviews.slice(0, 100)) { // Analyze first 100 to avoid overload
    const analysis = await analyzeSingleReview(review, { allReviews: reviews });
    individualAnalyses.push(analysis);

    if (analysis.fakeScore >= 60) {
      suspiciousCount++;
    }
  }

  return {
    appId,
    overallFakeScore: overallScore.score,
    verdict: overallScore.verdict,
    totalReviews: reviews.length,
    suspiciousReviews: suspiciousCount,
    suspiciousRatio: suspiciousCount / Math.min(reviews.length, 100),
    analysis: {
      breakdown: overallScore.breakdown,
      signals: signals,
      topSuspiciousReviews: individualAnalyses
        .filter(a => a.fakeScore >= 60)
        .sort((a, b) => b.fakeScore - a.fakeScore)
        .slice(0, 10)
    },
    recommendations: generateRecommendations(overallScore.score, signals)
  };
}

/**
 * Analyze multiple reviews' text collectively
 */
function analyzeMultipleReviews(reviews) {
  let totalConfidence = 0;
  let count = 0;

  for (const review of reviews) {
    const signals = analyzeReviewText(review.review_text);
    totalConfidence += signals.confidence;
    count++;
  }

  return {
    confidence: count > 0 ? Math.round(totalConfidence / count) : 0
  };
}

/**
 * Generate red flags based on detected signals
 */
function generateRedFlags(signals, score) {
  const flags = [];

  if (signals.text?.isGPTGenerated) {
    flags.push({
      severity: 'HIGH',
      category: 'Bot Detection',
      description: 'Review text appears to be AI-generated (GPT-like patterns detected)'
    });
  }

  if (signals.text?.isTemplate) {
    flags.push({
      severity: 'MEDIUM',
      category: 'Template Detection',
      description: 'Review uses template phrases common in fake reviews'
    });
  }

  if (signals.text?.hasSpamKeywords) {
    flags.push({
      severity: 'HIGH',
      category: 'Spam',
      description: 'Review contains spam keywords or promotional links'
    });
  }

  if (signals.behavior?.newAccountSpam) {
    flags.push({
      severity: 'HIGH',
      category: 'Account Age',
      description: 'Review posted within 24 hours of account creation'
    });
  }

  if (signals.behavior?.singlePurposeAccount) {
    flags.push({
      severity: 'MEDIUM',
      category: 'User Behavior',
      description: 'Account created solely to review this app (possible paid review)'
    });
  }

  if (score >= 80) {
    flags.push({
      severity: 'CRITICAL',
      category: 'Overall Assessment',
      description: `High confidence (${score}/100) this review is fake or manipulated`
    });
  }

  return flags;
}

/**
 * Generate recommendations for app owners/moderators
 */
function generateRecommendations(score, signals) {
  const recs = [];

  if (score >= 80) {
    recs.push('IMMEDIATE ACTION: Remove highly suspicious reviews and investigate patterns');
  }

  if (signals.timing?.suspiciousBursts) {
    recs.push('Implement rate limiting: Restrict review submissions to prevent burst campaigns');
  }

  if (signals.duplicates?.exactDuplicates > 5) {
    recs.push('Enable duplicate detection: Auto-flag identical review text');
  }

  if (signals.network?.coordinatedCampaign) {
    recs.push('Review IP patterns: Investigate if multiple reviews coming from same network');
  }

  if (signals.text?.confidence > 60) {
    recs.push('Enable text analysis: Filter GPT-generated and template-based reviews');
  }

  return recs;
}

// ============================================================================
// Exports
// ============================================================================

module.exports = {
  // Main functions
  analyzeSingleReview,
  analyzeAppReviews,

  // Individual layer functions (for testing/debugging)
  analyzeTimingPatterns,
  analyzeRatingDistribution,
  analyzeReviewText,
  detectDuplicates,
  analyzeUserBehavior,
  detectReviewNetworks,
  calculateFakeReviewScore,

  // Utilities
  getVerdict,
  generateRedFlags,
  generateRecommendations
};
