// backend/agents/sentimentAnalysisAgent.js
// AI agent for sentiment analysis of reviews, comments, and text content

class SentimentAnalysisAgent {
  constructor() {
    this.name = 'SentimentAnalysisAgent';
    this.version = '1.0.0';
    this.initialized = false;
    this.totalProcessed = 0;
    this.lastUsed = null;

    // Sentiment lexicon (simplified)
    this.positiveWords = new Set([
      'good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'best',
      'perfect', 'awesome', 'brilliant', 'outstanding', 'superb', 'terrific', 'impressive',
    ]);

    this.negativeWords = new Set([
      'bad', 'terrible', 'awful', 'horrible', 'worst', 'hate', 'disappointing', 'poor',
      'useless', 'waste', 'broken', 'buggy', 'crash', 'slow', 'frustrating', 'annoying',
    ]);

    this.intensifiers = new Set(['very', 'extremely', 'absolutely', 'completely', 'totally']);
    this.negations = new Set(['not', 'no', 'never', "n't", 'neither', 'nor']);
  }

  async initialize() {
    console.log(`🤖 Initializing ${this.name}...`);
    // Load NLP models if needed
    this.initialized = true;
    return { status: 'ready', agent: this.name };
  }

  /**
   * Analyze sentiment of text
   * @param {string} text - The text to analyze
   * @param {Object} options - Additional options
   * @returns {Object} Sentiment analysis result
   */
  async process(text, options = {}) {
    if (!text || typeof text !== 'string') {
      throw new Error('Invalid text provided');
    }

    const words = this.tokenize(text.toLowerCase());
    let score = 0;
    let positiveCount = 0;
    let negativeCount = 0;
    let neutralCount = 0;

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const prevWord = i > 0 ? words[i - 1] : null;
      const nextWord = i < words.length - 1 ? words[i + 1] : null;

      let wordScore = 0;

      if (this.positiveWords.has(word)) {
        wordScore = 1;
        positiveCount++;
      } else if (this.negativeWords.has(word)) {
        wordScore = -1;
        negativeCount++;
      } else {
        neutralCount++;
        continue;
      }

      // Apply intensifiers
      if (prevWord && this.intensifiers.has(prevWord)) {
        wordScore *= 1.5;
      }

      // Apply negations
      if (prevWord && this.negations.has(prevWord)) {
        wordScore *= -1;
      }

      score += wordScore;
    }

    // Normalize score to -1 to 1 range
    const totalWords = words.length;
    const normalizedScore = totalWords > 0 ? score / totalWords : 0;

    // Determine sentiment category
    const sentiment = this.categorize(normalizedScore);
    const confidence = this.calculateConfidence(positiveCount, negativeCount, neutralCount);

    this.totalProcessed++;
    this.lastUsed = new Date().toISOString();

    return {
      sentiment,
      score: normalizedScore,
      confidence,
      details: {
        positive: positiveCount,
        negative: negativeCount,
        neutral: neutralCount,
        totalWords,
      },
      magnitude: Math.abs(normalizedScore),
      analyzedAt: new Date().toISOString(),
    };
  }

  /**
   * Tokenize text into words
   */
  tokenize(text) {
    return text
      .replace(/[^\w\s']/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 0);
  }

  /**
   * Categorize sentiment based on score
   */
  categorize(score) {
    if (score >= 0.2) return 'positive';
    if (score <= -0.2) return 'negative';
    return 'neutral';
  }

  /**
   * Calculate confidence based on word counts
   */
  calculateConfidence(positive, negative, neutral) {
    const total = positive + negative + neutral;
    if (total === 0) return 0;

    const opinionated = positive + negative;
    const confidence = opinionated / total;

    // Boost confidence if there's strong agreement
    const strongAgreement = Math.max(positive, negative) / (positive + negative || 1);
    return Math.min((confidence + strongAgreement) / 2, 1);
  }

  async shutdown() {
    console.log(`🛑 Shutting down ${this.name}...`);
    this.initialized = false;
  }
}

module.exports = new SentimentAnalysisAgent();
