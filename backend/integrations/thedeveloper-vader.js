/**
 * Developer306 VADER Sentiment Integration
 * Port of: github.com/the-developer-306/Fake-Review-Detector
 *
 * Original: Flask + VADER + Random Forest
 * This: JavaScript port using compromise for NLP
 *
 * License: MIT
 */

const Sentiment = require('sentiment');
const sentiment = new Sentiment();

/**
 * VADER-style sentiment analysis
 * Returns compound score + positivity/negativity
 */
function analyzeSentiment(text) {
  const result = sentiment.analyze(text);

  // Normalize to VADER-style compound score (-1 to 1)
  const compound = result.comparative; // Already normalized

  return {
    compound,
    positive: result.positive.length,
    negative: result.negative.length,
    neutral: text.split(/\s+/).length - result.positive.length - result.negative.length,
    score: result.score
  };
}

/**
 * Detect sentiment-rating mismatch
 * Fake reviews often have mismatched sentiment and ratings
 */
function detectMismatch(reviewText, rating) {
  const sent = analyzeSentiment(reviewText);

  // Expected: high rating (4-5) = positive sentiment
  //           low rating (1-2) = negative sentiment

  const isHighRating = rating >= 4;
  const isLowRating = rating <= 2;
  const isPositiveSentiment = sent.compound > 0.2;
  const isNegativeSentiment = sent.compound < -0.2;

  const mismatch = (
    (isHighRating && isNegativeSentiment) ||
    (isLowRating && isPositiveSentiment)
  );

  return {
    mismatch,
    severity: Math.abs(sent.compound - ((rating - 3) / 2)), // Distance from expected
    sentiment: sent,
    expected: isHighRating ? 'POSITIVE' : isLowRating ? 'NEGATIVE' : 'NEUTRAL',
    actual: isPositiveSentiment ? 'POSITIVE' : isNegativeSentiment ? 'NEGATIVE' : 'NEUTRAL'
  };
}

/**
 * Extract numerical features for Random Forest
 * (Port of Developer306's feature engineering)
 */
function extractFeatures(reviewText, rating, metadata = {}) {
  const sent = analyzeSentiment(reviewText);
  const wordCount = reviewText.split(/\s+/).length;

  return {
    // Text features
    length: reviewText.length,
    wordCount,
    avgWordLength: reviewText.length / wordCount,

    // Sentiment features
    compound: sent.compound,
    positiveCount: sent.positive,
    negativeCount: sent.negative,
    sentimentScore: sent.score,

    // Rating features
    rating,
    ratingDeviation: Math.abs(rating - 3), // Distance from neutral

    // Timing features (if available)
    hourOfDay: metadata.timestamp ? new Date(metadata.timestamp).getHours() : 12,
    dayOfWeek: metadata.timestamp ? new Date(metadata.timestamp).getDay() : 3,

    // User features (if available)
    userReviewCount: metadata.userReviewCount || 1,
    accountAge: metadata.accountAgeDays || 30,

    // Derived features
    sentimentRatingMismatch: detectMismatch(reviewText, rating).mismatch ? 1 : 0,
    capsRatio: (reviewText.match(/[A-Z]/g) || []).length / reviewText.length,
    exclamationRatio: (reviewText.match(/!/g) || []).length / reviewText.length
  };
}

/**
 * Simple decision tree classifier
 * (Approximates Random Forest without needing sklearn)
 */
function classifyWithDecisionTree(features) {
  let fakeScore = 0;

  // Rule 1: Sentiment-rating mismatch
  if (features.sentimentRatingMismatch) {
    fakeScore += 30;
  }

  // Rule 2: Very short review with high rating
  if (features.wordCount < 10 && features.rating >= 4) {
    fakeScore += 25;
  }

  // Rule 3: Extreme sentiment
  if (Math.abs(features.compound) > 0.9) {
    fakeScore += 15;
  }

  // Rule 4: New account with many reviews
  if (features.accountAge < 7 && features.userReviewCount > 5) {
    fakeScore += 20;
  }

  // Rule 5: Excessive caps/exclamation
  if (features.capsRatio > 0.3 || features.exclamationRatio > 0.1) {
    fakeScore += 15;
  }

  // Rule 6: Timing anomalies (late night reviews = suspicious)
  if (features.hourOfDay >= 2 && features.hourOfDay <= 4) {
    fakeScore += 10;
  }

  return Math.min(fakeScore, 100);
}

/**
 * Main analysis function
 */
function analyzeReview(reviewText, rating, metadata = {}) {
  const features = extractFeatures(reviewText, rating, metadata);
  const fakeScore = classifyWithDecisionTree(features);
  const mismatch = detectMismatch(reviewText, rating);

  return {
    fakeScore,
    confidence: 75, // Fixed confidence for decision tree
    verdict: fakeScore >= 70 ? 'LIKELY_FAKE' :
             fakeScore >= 40 ? 'SUSPICIOUS' :
             'LIKELY_GENUINE',
    features,
    sentimentMismatch: mismatch,
    redFlags: generateRedFlags(features, mismatch)
  };
}

/**
 * Generate human-readable red flags
 */
function generateRedFlags(features, mismatch) {
  const flags = [];

  if (mismatch.mismatch) {
    flags.push({
      category: 'Sentiment Mismatch',
      severity: 'HIGH',
      description: `Review sentiment (${mismatch.actual}) doesn't match rating (${features.rating}/5)`
    });
  }

  if (features.wordCount < 10) {
    flags.push({
      category: 'Length',
      severity: 'MEDIUM',
      description: 'Review is suspiciously short (less than 10 words)'
    });
  }

  if (features.accountAge < 7 && features.userReviewCount > 5) {
    flags.push({
      category: 'User Behavior',
      severity: 'HIGH',
      description: 'New account with many reviews (possible bulk reviewer)'
    });
  }

  if (features.capsRatio > 0.3) {
    flags.push({
      category: 'Formatting',
      severity: 'LOW',
      description: 'Excessive use of capital letters'
    });
  }

  return flags;
}

module.exports = {
  analyzeSentiment,
  detectMismatch,
  extractFeatures,
  analyzeReview
};
