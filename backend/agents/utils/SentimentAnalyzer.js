// Advanced Sentiment Analysis - Multi-method sentiment detection
// Combines rule-based, lexicon-based, and contextual analysis

class SentimentAnalyzer {
  constructor() {
    // Positive sentiment keywords with weights
    this.positiveWords = {
      // Strong positive (weight: 2.0)
      'excellent': 2.0, 'amazing': 2.0, 'outstanding': 2.0, 'exceptional': 2.0,
      'fantastic': 2.0, 'brilliant': 2.0, 'superb': 2.0, 'magnificent': 2.0,
      'phenomenal': 2.0, 'incredible': 2.0, 'perfect': 2.0, 'flawless': 2.0,

      // Moderate positive (weight: 1.5)
      'great': 1.5, 'good': 1.5, 'love': 1.5, 'awesome': 1.5, 'wonderful': 1.5,
      'impressive': 1.5, 'solid': 1.5, 'reliable': 1.5, 'trustworthy': 1.5,
      'helpful': 1.5, 'useful': 1.5, 'effective': 1.5, 'efficient': 1.5,

      // Mild positive (weight: 1.0)
      'nice': 1.0, 'decent': 1.0, 'ok': 1.0, 'okay': 1.0, 'fine': 1.0,
      'satisfactory': 1.0, 'adequate': 1.0, 'acceptable': 1.0, 'works': 1.0
    };

    // Negative sentiment keywords with weights
    this.negativeWords = {
      // Strong negative (weight: -2.0)
      'terrible': -2.0, 'horrible': -2.0, 'awful': -2.0, 'pathetic': -2.0,
      'disgusting': -2.0, 'garbage': -2.0, 'trash': -2.0, 'scam': -2.0,
      'fraud': -2.0, 'worst': -2.0, 'useless': -2.0, 'worthless': -2.0,

      // Moderate negative (weight: -1.5)
      'bad': -1.5, 'poor': -1.5, 'hate': -1.5, 'disappointing': -1.5,
      'broken': -1.5, 'buggy': -1.5, 'crash': -1.5, 'unreliable': -1.5,
      'misleading': -1.5, 'deceptive': -1.5, 'unsafe': -1.5, 'dangerous': -1.5,

      // Mild negative (weight: -1.0)
      'meh': -1.0, 'mediocre': -1.0, 'subpar': -1.0, 'lacking': -1.0,
      'confusing': -1.0, 'complicated': -1.0, 'slow': -1.0, 'annoying': -1.0
    };

    // Negation words that flip sentiment
    this.negations = [
      'not', 'no', 'never', 'none', 'nobody', 'nothing', 'neither',
      'nowhere', 'hardly', 'scarcely', 'barely', 'cannot', 'cant', 'won\'t', 'wouldn\'t'
    ];

    // Intensifiers that amplify sentiment
    this.intensifiers = {
      'very': 1.5, 'extremely': 2.0, 'absolutely': 2.0, 'really': 1.5,
      'incredibly': 2.0, 'amazingly': 2.0, 'totally': 1.5, 'completely': 1.5,
      'utterly': 2.0, 'highly': 1.5, 'so': 1.3, 'too': 1.3
    };

    // Controversy indicators
    this.controversyKeywords = [
      'controversy', 'scandal', 'lawsuit', 'investigation', 'breach',
      'violation', 'banned', 'removed', 'suspended', 'accused', 'allegation',
      'complaint', 'issue', 'problem', 'concern', 'warning'
    ];
  }

  /**
   * Analyze sentiment of text
   * @param {string} text - Text to analyze
   * @returns {Object} - Sentiment analysis result
   */
  analyze(text) {
    if (!text || text.length === 0) {
      return this.neutralResult();
    }

    const normalized = text.toLowerCase();
    const words = normalized.split(/\s+/);

    // Calculate sentiment score
    let score = 0;
    let positiveCount = 0;
    let negativeCount = 0;
    let neutralCount = 0;

    for (let i = 0; i < words.length; i++) {
      const word = words[i];

      // Check for intensifiers before this word
      const intensifier = i > 0 ? this.intensifiers[words[i - 1]] : 1;

      // Check for negations before this word (within 3 words)
      const hasNegation = this.hasNegationBefore(words, i);

      // Get sentiment weight
      let weight = 0;

      if (this.positiveWords[word]) {
        weight = this.positiveWords[word] * (intensifier || 1);
        if (hasNegation) weight = -weight; // Flip sentiment
        positiveCount++;
      } else if (this.negativeWords[word]) {
        weight = this.negativeWords[word] * (intensifier || 1);
        if (hasNegation) weight = -weight; // Flip sentiment
        negativeCount++;
      } else {
        neutralCount++;
      }

      score += weight;
    }

    // Normalize score to -1 to +1 range
    const totalWords = words.length;
    const normalizedScore = totalWords > 0 ? score / totalWords : 0;

    // Classify sentiment
    const classification = this.classifySentiment(normalizedScore);

    // Detect controversy
    const isControversial = this.detectControversy(normalized);

    // Calculate confidence
    const sentimentWords = positiveCount + negativeCount;
    const confidence = Math.min(1, sentimentWords / Math.max(1, totalWords * 0.3));

    return {
      score: Math.max(-1, Math.min(1, normalizedScore)),
      classification,
      confidence,
      isControversial,
      breakdown: {
        positive: positiveCount,
        negative: negativeCount,
        neutral: neutralCount
      },
      rawScore: score
    };
  }

  /**
   * Check if there's a negation before the current word
   * @param {Array} words - Array of words
   * @param {number} index - Current word index
   * @returns {boolean} - Has negation
   */
  hasNegationBefore(words, index) {
    const lookback = 3; // Check up to 3 words before
    const start = Math.max(0, index - lookback);

    for (let i = start; i < index; i++) {
      if (this.negations.includes(words[i])) {
        return true;
      }
    }

    return false;
  }

  /**
   * Classify sentiment from normalized score
   * @param {number} score - Normalized score (-1 to +1)
   * @returns {string} - Classification
   */
  classifySentiment(score) {
    if (score > 0.5) return 'very_positive';
    if (score > 0.1) return 'positive';
    if (score > -0.1) return 'neutral';
    if (score > -0.5) return 'negative';
    return 'very_negative';
  }

  /**
   * Detect controversial content
   * @param {string} text - Normalized text
   * @returns {boolean} - Is controversial
   */
  detectControversy(text) {
    for (const keyword of this.controversyKeywords) {
      if (text.includes(keyword)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get neutral sentiment result
   * @returns {Object} - Neutral result
   */
  neutralResult() {
    return {
      score: 0,
      classification: 'neutral',
      confidence: 0,
      isControversial: false,
      breakdown: {
        positive: 0,
        negative: 0,
        neutral: 0
      },
      rawScore: 0
    };
  }

  /**
   * Analyze sentiment across multiple texts and aggregate
   * @param {Array<string>} texts - Array of texts
   * @returns {Object} - Aggregated sentiment
   */
  analyzeMultiple(texts) {
    if (!texts || texts.length === 0) {
      return this.neutralResult();
    }

    const results = texts.map(text => this.analyze(text));

    const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
    const avgConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / results.length;

    const totalBreakdown = results.reduce((acc, r) => ({
      positive: acc.positive + r.breakdown.positive,
      negative: acc.negative + r.breakdown.negative,
      neutral: acc.neutral + r.breakdown.neutral
    }), { positive: 0, negative: 0, neutral: 0 });

    const controversialCount = results.filter(r => r.isControversial).length;

    return {
      score: avgScore,
      classification: this.classifySentiment(avgScore),
      confidence: avgConfidence,
      isControversial: controversialCount > texts.length * 0.1, // >10% controversial
      breakdown: totalBreakdown,
      totalAnalyzed: texts.length,
      controversialCount
    };
  }

  /**
   * Compare sentiments (e.g., before vs after an event)
   * @param {Array<string>} beforeTexts - Texts before
   * @param {Array<string>} afterTexts - Texts after
   * @returns {Object} - Comparison result
   */
  compareSentiments(beforeTexts, afterTexts) {
    const before = this.analyzeMultiple(beforeTexts);
    const after = this.analyzeMultiple(afterTexts);

    const change = after.score - before.score;

    return {
      before,
      after,
      change,
      changePercentage: before.score !== 0 ? (change / Math.abs(before.score)) * 100 : 0,
      trend: change > 0.1 ? 'improving' : change < -0.1 ? 'declining' : 'stable'
    };
  }
}

module.exports = SentimentAnalyzer;
