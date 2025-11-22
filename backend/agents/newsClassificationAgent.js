// backend/agents/newsClassificationAgent.js
// AI agent for classifying news articles and content by topic, type, and quality

class NewsClassificationAgent {
  constructor() {
    this.name = 'NewsClassificationAgent';
    this.version = '1.0.0';
    this.initialized = false;
    this.totalProcessed = 0;
    this.lastUsed = null;

    // Content categories
    this.categories = {
      politics: ['election', 'government', 'policy', 'law', 'congress', 'senate'],
      technology: ['ai', 'software', 'hardware', 'tech', 'digital', 'cyber'],
      health: ['medical', 'health', 'disease', 'treatment', 'vaccine', 'hospital'],
      business: ['economy', 'market', 'stock', 'company', 'trade', 'finance'],
      science: ['research', 'study', 'scientist', 'discovery', 'experiment'],
      sports: ['game', 'player', 'team', 'championship', 'score', 'league'],
      entertainment: ['movie', 'music', 'celebrity', 'film', 'actor', 'show'],
      environment: ['climate', 'pollution', 'green', 'carbon', 'sustainability'],
    };

    // Content quality indicators
    this.qualityIndicators = {
      high: ['peer-reviewed', 'research', 'expert', 'analysis', 'investigation'],
      medium: ['report', 'coverage', 'interview', 'statement'],
      low: ['rumor', 'unconfirmed', 'alleged', 'claim', 'opinion'],
    };
  }

  async initialize() {
    console.log(`🤖 Initializing ${this.name}...`);
    // Load classification models
    this.initialized = true;
    return { status: 'ready', agent: this.name };
  }

  /**
   * Classify news content
   * @param {Object} content - The content to classify (title, body, metadata)
   * @param {Object} options - Classification options
   * @returns {Object} Classification result
   */
  async process(content, options = {}) {
    const { title, body, metadata = {} } = content;

    if (!title && !body) {
      throw new Error('No content provided for classification');
    }

    const text = `${title || ''} ${body || ''}`.toLowerCase();

    // Classify by category
    const categoryScores = this.classifyCategory(text);
    const primaryCategory = this.getPrimaryCategory(categoryScores);

    // Classify content type
    const contentType = this.classifyContentType(text, metadata);

    // Assess quality
    const qualityAssessment = this.assessQuality(text, metadata);

    // Detect bias
    const biasIndicators = this.detectBias(text);

    // Calculate confidence
    const confidence = this.calculateConfidence(categoryScores, contentType, qualityAssessment);

    this.totalProcessed++;
    this.lastUsed = new Date().toISOString();

    return {
      primaryCategory,
      categoryScores,
      contentType,
      quality: qualityAssessment,
      bias: biasIndicators,
      confidence,
      tags: this.generateTags(text, primaryCategory),
      classifiedAt: new Date().toISOString(),
    };
  }

  /**
   * Classify content by category
   */
  classifyCategory(text) {
    const scores = {};

    Object.entries(this.categories).forEach(([category, keywords]) => {
      let score = 0;

      keywords.forEach(keyword => {
        const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
        const matches = (text.match(regex) || []).length;
        score += matches;
      });

      // Normalize score
      scores[category] = score / keywords.length;
    });

    return scores;
  }

  /**
   * Get primary category
   */
  getPrimaryCategory(categoryScores) {
    let maxScore = 0;
    let primaryCategory = 'general';

    Object.entries(categoryScores).forEach(([category, score]) => {
      if (score > maxScore) {
        maxScore = score;
        primaryCategory = category;
      }
    });

    return maxScore > 0.5 ? primaryCategory : 'general';
  }

  /**
   * Classify content type
   */
  classifyContentType(text, metadata) {
    // Check for opinion/editorial markers
    if (/\b(opinion|editorial|column|perspective)\b/i.test(text)) {
      return 'opinion';
    }

    // Check for breaking news markers
    if (/\b(breaking|urgent|just in|developing)\b/i.test(text)) {
      return 'breaking_news';
    }

    // Check for analysis/explainer
    if (/\b(analysis|explained|explainer|deep dive)\b/i.test(text)) {
      return 'analysis';
    }

    // Check for investigation
    if (/\b(investigation|investigative|exclusive|reveals)\b/i.test(text)) {
      return 'investigative';
    }

    // Check for interview
    if (/\b(interview|q&a|conversation|talks to)\b/i.test(text)) {
      return 'interview';
    }

    // Check for fact-check
    if (/\b(fact.?check|fact.?checked|verified|debunk)\b/i.test(text)) {
      return 'fact_check';
    }

    return 'news_report';
  }

  /**
   * Assess content quality
   */
  assessQuality(text, metadata) {
    let score = 0.5; // Baseline
    const indicators = [];

    // Check for high-quality indicators
    this.qualityIndicators.high.forEach(indicator => {
      if (text.includes(indicator)) {
        score += 0.15;
        indicators.push({ type: 'high', indicator });
      }
    });

    // Check for medium-quality indicators
    this.qualityIndicators.medium.forEach(indicator => {
      if (text.includes(indicator)) {
        score += 0.05;
        indicators.push({ type: 'medium', indicator });
      }
    });

    // Check for low-quality indicators
    this.qualityIndicators.low.forEach(indicator => {
      if (text.includes(indicator)) {
        score -= 0.1;
        indicators.push({ type: 'low', indicator });
      }
    });

    // Check for citations/sources
    const citationCount = (text.match(/according to|source:|cited|study found/gi) || []).length;
    if (citationCount > 3) {
      score += 0.2;
      indicators.push({ type: 'high', indicator: 'multiple_citations' });
    }

    // Check metadata
    if (metadata.author) {
      score += 0.1;
      indicators.push({ type: 'medium', indicator: 'has_author' });
    }

    score = Math.max(0, Math.min(1, score));

    return {
      score,
      level: score >= 0.75 ? 'high' : score >= 0.5 ? 'medium' : 'low',
      indicators,
    };
  }

  /**
   * Detect potential bias
   */
  detectBias(text) {
    const biasIndicators = {
      loaded_language: ['terrible', 'outrageous', 'shocking', 'scandalous', 'disgraceful'],
      absolute_terms: ['always', 'never', 'all', 'none', 'completely', 'totally'],
      emotional_appeal: ['fear', 'angry', 'outraged', 'terrified', 'heartbreaking'],
    };

    const detected = [];

    Object.entries(biasIndicators).forEach(([type, words]) => {
      words.forEach(word => {
        if (new RegExp(`\\b${word}\\b`, 'i').test(text)) {
          detected.push({ type, word });
        }
      });
    });

    const biasScore = Math.min(detected.length * 0.1, 1);

    return {
      score: biasScore,
      level: biasScore >= 0.5 ? 'high' : biasScore >= 0.3 ? 'medium' : 'low',
      indicators: detected,
    };
  }

  /**
   * Calculate classification confidence
   */
  calculateConfidence(categoryScores, contentType, qualityAssessment) {
    const maxCategoryScore = Math.max(...Object.values(categoryScores));

    // Higher confidence if category is clear
    let confidence = maxCategoryScore > 1 ? 0.9 : maxCategoryScore > 0.5 ? 0.7 : 0.5;

    // Boost confidence for quality content
    if (qualityAssessment.level === 'high') {
      confidence += 0.1;
    }

    return Math.min(confidence, 1);
  }

  /**
   * Generate content tags
   */
  generateTags(text, primaryCategory) {
    const tags = [primaryCategory];

    // Extract entities (simplified)
    const capitalizedWords = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || [];
    const uniqueWords = [...new Set(capitalizedWords)].slice(0, 5);

    tags.push(...uniqueWords);

    return tags;
  }

  async shutdown() {
    console.log(`🛑 Shutting down ${this.name}...`);
    this.initialized = false;
  }
}

module.exports = new NewsClassificationAgent();
