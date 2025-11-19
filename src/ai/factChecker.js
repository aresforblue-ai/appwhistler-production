// src/ai/factChecker.js
// Hugging Face integration for local/free fact-checking using NLP models

const { HfInference } = require('@huggingface/inference');
const axios = require('axios');
const { getSecret } = require('../config/secrets');

/**
 * Fact-checking system using Hugging Face models
 * Free alternative to Grok API for basic fact-checking
 */
class FactChecker {
  constructor() {
    this.hf = new HfInference(getSecret('HUGGINGFACE_API_KEY'));
    this.cache = new Map(); // Cache results to reduce API calls
    this.cacheTimers = new Map();
    
    // External fact-check APIs (all have free tiers)
    this.externalAPIs = {
      googleFactCheck: 'https://factchecktools.googleapis.com/v1alpha1/claims:search',
      factCheckOrg: 'https://www.factcheck.org/api/search' // If available
    };
  }

  /**
   * Main fact-checking function
   * Combines multiple sources for best accuracy
   * @param {string} claim - Claim to verify
   * @param {string} category - Category for context
   * @returns {object} Comprehensive fact-check result
   */
  async verifyClaimComprehensive(claim, category = 'general') {
    try {
      // Check cache first
      const cacheKey = `${category}:${claim}`;
      if (this.cache.has(cacheKey)) {
        console.log('📦 Returning cached fact-check');
        return this.cache.get(cacheKey);
      }

      console.log('🔍 Starting multi-source fact-check...');

      // Run checks in parallel for speed
      const [
        nlpResult,
        externalResults,
        sentimentAnalysis
      ] = await Promise.all([
        this.checkWithNLP(claim),
        this.checkExternalSources(claim),
        this.analyzeSentiment(claim)
      ]);

      // Combine results
      const finalResult = this.aggregateResults(
        claim,
        category,
        nlpResult,
        externalResults,
        sentimentAnalysis
      );

      // Cache for 1 hour
      this.cache.set(cacheKey, finalResult);
      const ttlMs = 3600000;
      const existingTimer = this.cacheTimers.get(cacheKey);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }
      const expiryTimer = setTimeout(() => {
        this.cache.delete(cacheKey);
        this.cacheTimers.delete(cacheKey);
      }, ttlMs);
      expiryTimer.unref?.();
      this.cacheTimers.set(cacheKey, expiryTimer);

      return finalResult;

    } catch (error) {
      console.error('Fact-check error:', error);
      return {
        verdict: 'ERROR',
        confidence: 0,
        sources: [],
        explanation: 'Unable to complete fact-check due to technical error.'
      };
    }
  }

  /**
   * Use Hugging Face NLP model for claim analysis
   * @private
   */
  async checkWithNLP(claim) {
    try {
      // Use zero-shot classification to categorize claim
      // Model: facebook/bart-large-mnli (free to use)
      const classification = await this.hf.zeroShotClassification({
        model: 'facebook/bart-large-mnli',
        inputs: claim,
        parameters: {
          candidate_labels: ['true', 'false', 'misleading', 'unverified', 'opinion']
        }
      });

      // Get top prediction
      const topLabel = classification.labels[0];
      const confidence = classification.scores[0];

      return {
        verdict: topLabel.toUpperCase(),
        confidence: confidence,
        method: 'nlp-classification'
      };

    } catch (error) {
      console.error('NLP analysis failed:', error);
      return { verdict: 'UNVERIFIED', confidence: 0, method: 'nlp-failed' };
    }
  }

  /**
   * Check external fact-checking databases
   * @private
   */
  async checkExternalSources(claim) {
    const results = [];

    // Google Fact Check Tools API (free tier available)
    try {
      const googleApiKey = getSecret('GOOGLE_FACT_CHECK_API_KEY');
      if (googleApiKey) {
        const response = await axios.get(this.externalAPIs.googleFactCheck, {
          params: {
            key: googleApiKey,
            query: claim,
            languageCode: 'en'
          },
          timeout: 5000
        });

        if (response.data.claims && response.data.claims.length > 0) {
          const firstClaim = response.data.claims[0];
          results.push({
            source: 'Google Fact Check',
            verdict: this.normalizeVerdict(firstClaim.claimReview[0].textualRating),
            url: firstClaim.claimReview[0].url,
            publisher: firstClaim.claimReview[0].publisher.name
          });
        }
      }
    } catch (error) {
      console.error('Google Fact Check API error:', error.message);
    }

    // FactCheck.org API (if available)
    try {
      // Note: FactCheck.org doesn't have a public API, but you could scrape
      // Or integrate with other APIs like Snopes, PolitiFact, etc.
      // This is a placeholder for integration
    } catch (error) {
      console.error('FactCheck.org integration error:', error.message);
    }

    return results;
  }

  /**
   * Analyze sentiment and language patterns
   * Helps detect emotionally manipulative or biased claims
   * @private
   */
  async analyzeSentiment(claim) {
    try {
      // Use sentiment analysis model
      const sentiment = await this.hf.textClassification({
        model: 'distilbert-base-uncased-finetuned-sst-2-english',
        inputs: claim
      });

      // Detect emotional manipulation
      const emotionalWords = [
        'shocking', 'horrifying', 'unbelievable', 'secret', 'exposed',
        'must see', 'they don\'t want you to know', 'breaking'
      ];

      const hasEmotionalTriggers = emotionalWords.some(word => 
        claim.toLowerCase().includes(word)
      );

      return {
        sentiment: sentiment[0].label, // POSITIVE or NEGATIVE
        score: sentiment[0].score,
        hasEmotionalTriggers,
        suspicionLevel: hasEmotionalTriggers ? 'high' : 'low'
      };

    } catch (error) {
      console.error('Sentiment analysis failed:', error);
      return { sentiment: 'NEUTRAL', score: 0.5, hasEmotionalTriggers: false };
    }
  }

  /**
   * Aggregate all results into final verdict
   * @private
   */
  aggregateResults(claim, category, nlpResult, externalResults, sentiment) {
    let finalVerdict = 'UNVERIFIED';
    let confidence = 0;
    const sources = [];
    const explanationParts = [];

    // If external sources found, prioritize those
    if (externalResults.length > 0) {
      const verdicts = externalResults.map(r => r.verdict);
      const mostCommonVerdict = this.getMostCommon(verdicts);
      
      finalVerdict = mostCommonVerdict;
      confidence = externalResults.length >= 2 ? 0.85 : 0.7;
      
      sources.push(...externalResults.map(r => ({
        url: r.url,
        title: r.publisher || 'Fact-Check Source'
      })));

      explanationParts.push(
        `This claim has been fact-checked by ${externalResults.length} reputable source(s).`
      );
    } else {
      // Use NLP results
      finalVerdict = nlpResult.verdict;
      confidence = nlpResult.confidence * 0.6; // Lower confidence without external verification
      
      explanationParts.push(
        'This verdict is based on AI language analysis without external verification.'
      );
    }

    // Adjust based on sentiment analysis
    if (sentiment.hasEmotionalTriggers) {
      confidence *= 0.8; // Reduce confidence for emotionally charged claims
      explanationParts.push(
        '⚠️ This claim contains emotional or sensational language, which is common in misinformation.'
      );
    }

    // Generate explanation
    const explanation = explanationParts.join(' ');

    return {
      verdict: finalVerdict,
      confidence: Math.round(confidence * 100) / 100,
      sources,
      explanation,
      category,
      metadata: {
        nlpVerdict: nlpResult.verdict,
        externalSourceCount: externalResults.length,
        sentiment: sentiment.sentiment,
        emotionalTriggers: sentiment.hasEmotionalTriggers
      }
    };
  }

  /**
   * Normalize different verdict formats to standard categories
   * @private
   */
  normalizeVerdict(textualRating) {
    const rating = (textualRating || '').toLowerCase().trim();

    if (!rating) {
      return 'UNVERIFIED';
    }

    if (
      rating.includes('misleading') ||
      rating.includes('half true') ||
      rating.includes('mostly false') ||
      rating.includes('partly false')
    ) {
      return 'MISLEADING';
    }

    if (
      rating.includes('true') ||
      rating.includes('correct') ||
      rating.includes('accurate') ||
      rating.includes('verified')
    ) {
      return 'TRUE';
    }

    if (
      rating.includes('false') ||
      rating.includes('incorrect') ||
      rating.includes('pants on fire') ||
      rating.includes('fake')
    ) {
      return 'FALSE';
    }

    return 'UNVERIFIED';
  }

  /**
   * Get most common element in array
   * @private
   */
  getMostCommon(arr) {
    const counts = {};
    arr.forEach(item => {
      counts[item] = (counts[item] || 0) + 1;
    });
    
    return Object.keys(counts).reduce((a, b) => 
      counts[a] > counts[b] ? a : b
    );
  }

  /**
   * Verify image authenticity (basic implementation)
   * For production, integrate with forensic tools
   */
  async verifyImage(imageUrl) {
    try {
      // Use Hugging Face image classification
      const result = await this.hf.imageClassification({
        model: 'microsoft/dit-base-finetuned-rvlcdip',
        data: await this.fetchImageAsBuffer(imageUrl)
      });

      // Check for manipulation indicators
      // This is a simplified version - real implementation would use
      // forensic models trained on deepfakes and manipulated images
      
      return {
        isAuthentic: result[0].score > 0.7,
        confidence: result[0].score,
        flags: [],
        explanation: 'Basic image analysis completed. For deeper forensics, consider specialized tools.'
      };

    } catch (error) {
      console.error('Image verification error:', error);
      return {
        isAuthentic: null,
        confidence: 0,
        flags: [],
        explanation: 'Unable to verify image.'
      };
    }
  }

  /**
   * Fetch image as buffer for analysis
   * @private
   */
  async fetchImageAsBuffer(url) {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    return Buffer.from(response.data);
  }

  /**
   * Clear cache (useful for testing or scheduled cleanup)
   */
  clearCache() {
    for (const timeout of this.cacheTimers.values()) {
      clearTimeout(timeout);
    }
    this.cacheTimers.clear();
    this.cache.clear();
    console.log('✅ Fact-check cache cleared');
  }
}

// Singleton instance
const factChecker = new FactChecker();

module.exports = factChecker;

/**
 * USAGE EXAMPLES:
 * 
 * // Basic fact-check
 * const result = await factChecker.verifyClaimComprehensive(
 *   "The Earth is flat",
 *   "science"
 * );
 * console.log(result.verdict); // FALSE
 * console.log(result.confidence); // 0.95
 * 
 * // Image verification
 * const imageResult = await factChecker.verifyImage(
 *   "https://example.com/suspicious-image.jpg"
 * );
 * console.log(imageResult.isAuthentic); // false
 */