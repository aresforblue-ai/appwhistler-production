// backend/agents/claimExtractionAgent.js
// AI agent for extracting factual claims from text content

class ClaimExtractionAgent {
  constructor() {
    this.name = 'ClaimExtractionAgent';
    this.version = '1.0.0';
    this.initialized = false;
    this.totalProcessed = 0;
    this.lastUsed = null;

    // Claim indicator patterns
    this.claimIndicators = {
      factual: ['is', 'are', 'was', 'were', 'has', 'have', 'will'],
      statistics: /\d+%|\d+\s+(percent|million|billion|thousand)/i,
      causation: ['caused by', 'leads to', 'results in', 'because of'],
      comparison: ['more than', 'less than', 'better than', 'worse than'],
    };
  }

  async initialize() {
    console.log(`🤖 Initializing ${this.name}...`);
    // Initialize NLP models for claim extraction
    this.initialized = true;
    return { status: 'ready', agent: this.name };
  }

  /**
   * Extract claims from text
   * @param {string} text - The text to extract claims from
   * @param {Object} options - Extraction options
   * @returns {Object} Claim extraction result
   */
  async process(text, options = {}) {
    if (!text || typeof text !== 'string') {
      throw new Error('Invalid text provided');
    }

    const { minConfidence = 0.5, includeImplicit = false } = options;

    // Split text into sentences
    const sentences = this.splitIntoSentences(text);

    // Extract claims from each sentence
    const claims = [];

    for (const sentence of sentences) {
      const extractedClaims = this.extractClaimsFromSentence(sentence, includeImplicit);
      claims.push(...extractedClaims);
    }

    // Filter by confidence
    const filteredClaims = claims.filter(c => c.confidence >= minConfidence);

    // Categorize claims
    const categorized = this.categorizeClaims(filteredClaims);

    this.totalProcessed++;
    this.lastUsed = new Date().toISOString();

    return {
      totalClaims: filteredClaims.length,
      claims: filteredClaims,
      categorized,
      summary: this.generateSummary(filteredClaims, categorized),
      extractedAt: new Date().toISOString(),
    };
  }

  /**
   * Split text into sentences
   */
  splitIntoSentences(text) {
    // Simple sentence splitting (in production, use proper NLP)
    return text
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 10);
  }

  /**
   * Extract claims from a single sentence
   */
  extractClaimsFromSentence(sentence, includeImplicit) {
    const claims = [];

    // Check for factual claims
    const hasFactualIndicator = this.claimIndicators.factual.some(indicator =>
      new RegExp(`\\b${indicator}\\b`, 'i').test(sentence)
    );

    if (hasFactualIndicator) {
      claims.push({
        text: sentence,
        type: 'factual',
        confidence: 0.8,
        indicators: ['factual_verb'],
      });
    }

    // Check for statistical claims
    if (this.claimIndicators.statistics.test(sentence)) {
      const stats = sentence.match(this.claimIndicators.statistics);
      claims.push({
        text: sentence,
        type: 'statistical',
        confidence: 0.9,
        statistics: stats,
        indicators: ['contains_statistics'],
      });
    }

    // Check for causal claims
    const causalIndicator = this.claimIndicators.causation.find(indicator =>
      sentence.toLowerCase().includes(indicator)
    );

    if (causalIndicator) {
      claims.push({
        text: sentence,
        type: 'causal',
        confidence: 0.75,
        indicators: ['causation_language'],
      });
    }

    // Check for comparative claims
    const comparativeIndicator = this.claimIndicators.comparison.find(indicator =>
      sentence.toLowerCase().includes(indicator)
    );

    if (comparativeIndicator) {
      claims.push({
        text: sentence,
        type: 'comparative',
        confidence: 0.7,
        indicators: ['comparison_language'],
      });
    }

    // If no specific claim found but sentence seems factual
    if (claims.length === 0 && includeImplicit && sentence.length > 20) {
      claims.push({
        text: sentence,
        type: 'implicit',
        confidence: 0.5,
        indicators: ['implicit_claim'],
      });
    }

    return claims;
  }

  /**
   * Categorize claims by type
   */
  categorizeClaims(claims) {
    const categorized = {
      factual: [],
      statistical: [],
      causal: [],
      comparative: [],
      implicit: [],
    };

    claims.forEach(claim => {
      if (categorized[claim.type]) {
        categorized[claim.type].push(claim);
      }
    });

    return categorized;
  }

  /**
   * Generate summary
   */
  generateSummary(claims, categorized) {
    return {
      total: claims.length,
      byType: {
        factual: categorized.factual.length,
        statistical: categorized.statistical.length,
        causal: categorized.causal.length,
        comparative: categorized.comparative.length,
        implicit: categorized.implicit.length,
      },
      avgConfidence: claims.length > 0
        ? claims.reduce((sum, c) => sum + c.confidence, 0) / claims.length
        : 0,
      verifiable: claims.filter(c => c.type !== 'implicit').length,
    };
  }

  async shutdown() {
    console.log(`🛑 Shutting down ${this.name}...`);
    this.initialized = false;
  }
}

module.exports = new ClaimExtractionAgent();
