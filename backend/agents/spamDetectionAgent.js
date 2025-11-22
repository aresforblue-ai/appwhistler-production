// backend/agents/spamDetectionAgent.js
// AI agent for detecting spam, promotional content, and bot-generated text

class SpamDetectionAgent {
  constructor() {
    this.name = 'SpamDetectionAgent';
    this.version = '1.0.0';
    this.initialized = false;
    this.totalProcessed = 0;
    this.lastUsed = null;

    // Spam indicators
    this.spamPatterns = [
      /click here/i,
      /buy now/i,
      /limited time/i,
      /act now/i,
      /free money/i,
      /guaranteed/i,
      /winner/i,
      /congratulations/i,
      /\$\$\$/,
      /http[s]?:\/\/bit\.ly/i,
      /\b(viagra|cialis|pharmacy)\b/i,
    ];

    this.suspiciousCharacteristics = {
      excessiveUrls: 3,
      excessiveCaps: 0.3, // 30% of text in caps
      excessiveExclamation: 3,
      excessiveEmoji: 5,
    };
  }

  async initialize() {
    console.log(`🤖 Initializing ${this.name}...`);
    this.initialized = true;
    return { status: 'ready', agent: this.name };
  }

  /**
   * Detect spam in text
   * @param {string} text - The text to analyze
   * @param {Object} options - Additional options (user history, metadata)
   * @returns {Object} Spam detection result
   */
  async process(text, options = {}) {
    if (!text || typeof text !== 'string') {
      throw new Error('Invalid text provided');
    }

    const indicators = [];
    let spamScore = 0;

    // Check spam patterns
    for (const pattern of this.spamPatterns) {
      if (pattern.test(text)) {
        indicators.push({ type: 'pattern', pattern: pattern.source, weight: 2 });
        spamScore += 2;
      }
    }

    // Check URL count
    const urlCount = (text.match(/https?:\/\//g) || []).length;
    if (urlCount >= this.suspiciousCharacteristics.excessiveUrls) {
      indicators.push({ type: 'urls', count: urlCount, weight: 1.5 });
      spamScore += 1.5;
    }

    // Check caps ratio
    const capsRatio = (text.match(/[A-Z]/g) || []).length / text.length;
    if (capsRatio >= this.suspiciousCharacteristics.excessiveCaps) {
      indicators.push({ type: 'caps', ratio: capsRatio, weight: 1 });
      spamScore += 1;
    }

    // Check exclamation marks
    const exclamationCount = (text.match(/!/g) || []).length;
    if (exclamationCount >= this.suspiciousCharacteristics.excessiveExclamation) {
      indicators.push({ type: 'exclamation', count: exclamationCount, weight: 1 });
      spamScore += 1;
    }

    // Check emoji count (basic check)
    const emojiCount = (text.match(/[\u{1F600}-\u{1F64F}]/gu) || []).length;
    if (emojiCount >= this.suspiciousCharacteristics.excessiveEmoji) {
      indicators.push({ type: 'emoji', count: emojiCount, weight: 0.5 });
      spamScore += 0.5;
    }

    // Check repetition
    if (this.hasExcessiveRepetition(text)) {
      indicators.push({ type: 'repetition', weight: 1.5 });
      spamScore += 1.5;
    }

    // Normalize score to 0-1 range
    const normalizedScore = Math.min(spamScore / 10, 1);

    const isSpam = normalizedScore >= 0.6;
    const requiresReview = normalizedScore >= 0.4 && normalizedScore < 0.6;

    this.totalProcessed++;
    this.lastUsed = new Date().toISOString();

    return {
      isSpam,
      requiresReview,
      score: normalizedScore,
      confidence: this.calculateConfidence(indicators.length),
      indicators,
      recommendation: this.getRecommendation(normalizedScore),
      analyzedAt: new Date().toISOString(),
    };
  }

  /**
   * Check for excessive repetition
   */
  hasExcessiveRepetition(text) {
    const words = text.toLowerCase().split(/\s+/);
    const wordCounts = {};

    words.forEach(word => {
      wordCounts[word] = (wordCounts[word] || 0) + 1;
    });

    // Check if any word appears more than 5 times
    return Object.values(wordCounts).some(count => count > 5);
  }

  /**
   * Calculate confidence based on number of indicators
   */
  calculateConfidence(indicatorCount) {
    return Math.min(indicatorCount * 0.2, 1);
  }

  /**
   * Get recommendation based on spam score
   */
  getRecommendation(score) {
    if (score >= 0.8) return 'block';
    if (score >= 0.6) return 'quarantine';
    if (score >= 0.4) return 'review';
    return 'allow';
  }

  async shutdown() {
    console.log(`🛑 Shutting down ${this.name}...`);
    this.initialized = false;
  }
}

module.exports = new SpamDetectionAgent();
