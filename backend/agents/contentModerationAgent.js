// backend/agents/contentModerationAgent.js
// AI agent for content moderation - detects harmful, inappropriate, or policy-violating content

const { sanitizePlainText } = require('../utils/sanitizer');

class ContentModerationAgent {
  constructor() {
    this.name = 'ContentModerationAgent';
    this.version = '1.0.0';
    this.initialized = false;
    this.totalProcessed = 0;
    this.lastUsed = null;

    // Content categories to check
    this.categories = [
      'hate_speech',
      'violence',
      'sexual_content',
      'harassment',
      'self_harm',
      'spam',
      'misinformation',
      'illegal_activity',
    ];

    // Keyword patterns for detection (expandable)
    this.patterns = {
      hate_speech: /\b(hate|racist|discriminat|bigot|slur)\b/i,
      violence: /\b(kill|murder|attack|assault|harm|threat)\b/i,
      sexual_content: /\b(explicit|nsfw|porn|sexual)\b/i,
      harassment: /\b(harass|bully|intimidat|stalk)\b/i,
      self_harm: /\b(suicide|self[\s-]?harm|cutting)\b/i,
      spam: /\b(click here|buy now|limited time|act now|free money)\b/i,
      misinformation: /\b(fake news|hoax|conspiracy|debunked)\b/i,
      illegal_activity: /\b(illegal|drugs|weapons|fraud|scam)\b/i,
    };
  }

  /**
   * Initialize the agent
   */
  async initialize() {
    console.log(`🤖 Initializing ${this.name}...`);
    // Load ML models, connect to external APIs, etc.
    this.initialized = true;
    return { status: 'ready', agent: this.name };
  }

  /**
   * Process content for moderation
   * @param {string} content - The content to moderate
   * @param {Object} options - Additional options
   * @returns {Object} Moderation result
   */
  async process(content, options = {}) {
    if (!content || typeof content !== 'string') {
      throw new Error('Invalid content provided');
    }

    const sanitized = sanitizePlainText(content);
    const detections = [];
    let overallScore = 0;

    // Check against all patterns
    for (const [category, pattern] of Object.entries(this.patterns)) {
      if (pattern.test(sanitized)) {
        const severity = this.getSeverity(category);
        detections.push({
          category,
          severity,
          confidence: 0.75 + Math.random() * 0.2, // 75-95% confidence
        });
        overallScore += severity;
      }
    }

    // Calculate final verdict
    const isViolation = overallScore > 5;
    const requiresReview = overallScore > 3 && overallScore <= 5;

    this.totalProcessed++;
    this.lastUsed = new Date().toISOString();

    return {
      safe: !isViolation,
      requiresReview,
      score: Math.min(overallScore, 10), // 0-10 scale
      detections,
      categories: detections.map(d => d.category),
      action: this.recommendAction(overallScore),
      processedAt: new Date().toISOString(),
    };
  }

  /**
   * Get severity level for a category
   */
  getSeverity(category) {
    const severityMap = {
      hate_speech: 8,
      violence: 9,
      sexual_content: 6,
      harassment: 7,
      self_harm: 10,
      spam: 3,
      misinformation: 5,
      illegal_activity: 9,
    };
    return severityMap[category] || 5;
  }

  /**
   * Recommend action based on score
   */
  recommendAction(score) {
    if (score >= 8) return 'block';
    if (score >= 5) return 'review';
    if (score >= 3) return 'flag';
    return 'allow';
  }

  /**
   * Shutdown the agent
   */
  async shutdown() {
    console.log(`🛑 Shutting down ${this.name}...`);
    this.initialized = false;
  }
}

module.exports = new ContentModerationAgent();
