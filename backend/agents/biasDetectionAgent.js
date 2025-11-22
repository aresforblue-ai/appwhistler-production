// backend/agents/biasDetectionAgent.js
// AI agent for detecting bias in content (political, cultural, gender, etc.)

class BiasDetectionAgent {
  constructor() {
    this.name = 'BiasDetectionAgent';
    this.version = '1.0.0';
    this.initialized = false;
    this.totalProcessed = 0;
    this.lastUsed = null;

    // Bias indicators
    this.biasPatterns = {
      loaded_language: {
        left: ['progressive', 'social justice', 'equality', 'inclusive'],
        right: ['traditional values', 'law and order', 'conservative', 'patriot'],
        positive: ['excellent', 'brilliant', 'outstanding', 'heroic'],
        negative: ['terrible', 'awful', 'disastrous', 'failed'],
      },
      framing: {
        victim: ['victim', 'suffer', 'oppressed', 'vulnerable'],
        threat: ['danger', 'threat', 'risk', 'harmful'],
        benefit: ['opportunity', 'advantage', 'benefit', 'gain'],
      },
    };
  }

  async initialize() {
    console.log(`🤖 Initializing ${this.name}...`);
    // Load bias detection models
    this.initialized = true;
    return { status: 'ready', agent: this.name };
  }

  /**
   * Detect bias in content
   * @param {Object} content - The content to analyze
   * @param {Object} options - Detection options
   * @returns {Object} Bias detection result
   */
  async process(content, options = {}) {
    const { text, title, metadata = {} } = content;

    if (!text && !title) {
      throw new Error('No content provided for analysis');
    }

    const fullText = `${title || ''} ${text || ''}`;

    // Detect different types of bias
    const politicalBias = this.detectPoliticalBias(fullText);
    const toneBias = this.detectToneBias(fullText);
    const framingBias = this.detectFramingBias(fullText);
    const selectionBias = this.detectSelectionBias(fullText, metadata);
    const sourceSelection = this.analyzeSourceSelection(metadata.sources || []);

    // Calculate overall bias score
    const overallBiasScore = this.calculateOverallBias({
      politicalBias,
      toneBias,
      framingBias,
      selectionBias,
      sourceSelection,
    });

    this.totalProcessed++;
    this.lastUsed = new Date().toISOString();

    return {
      biasScore: overallBiasScore,
      biasLevel: this.getBiasLevel(overallBiasScore),
      types: {
        political: politicalBias,
        tone: toneBias,
        framing: framingBias,
        selection: selectionBias,
        sourceSelection,
      },
      recommendations: this.getRecommendations(overallBiasScore),
      detectedAt: new Date().toISOString(),
    };
  }

  /**
   * Detect political bias
   */
  detectPoliticalBias(text) {
    const lower = text.toLowerCase();
    let leftScore = 0;
    let rightScore = 0;

    // Count left-leaning terms
    this.biasPatterns.loaded_language.left.forEach(term => {
      const regex = new RegExp(`\\b${term}\\b`, 'gi');
      const matches = (lower.match(regex) || []).length;
      leftScore += matches;
    });

    // Count right-leaning terms
    this.biasPatterns.loaded_language.right.forEach(term => {
      const regex = new RegExp(`\\b${term}\\b`, 'gi');
      const matches = (lower.match(regex) || []).length;
      rightScore += matches;
    });

    const total = leftScore + rightScore;
    const lean = total === 0 ? 'neutral' : leftScore > rightScore ? 'left' : rightScore > leftScore ? 'right' : 'balanced';

    const strength = total > 0 ? Math.abs(leftScore - rightScore) / total : 0;

    return {
      lean,
      strength,
      leftScore,
      rightScore,
      assessment: strength > 0.6 ? 'strong_bias' : strength > 0.3 ? 'moderate_bias' : 'minimal_bias',
    };
  }

  /**
   * Detect tone bias (positive/negative)
   */
  detectToneBias(text) {
    const lower = text.toLowerCase();
    let positiveScore = 0;
    let negativeScore = 0;

    // Count positive terms
    this.biasPatterns.loaded_language.positive.forEach(term => {
      const regex = new RegExp(`\\b${term}\\b`, 'gi');
      const matches = (lower.match(regex) || []).length;
      positiveScore += matches;
    });

    // Count negative terms
    this.biasPatterns.loaded_language.negative.forEach(term => {
      const regex = new RegExp(`\\b${term}\\b`, 'gi');
      const matches = (lower.match(regex) || []).length;
      negativeScore += matches;
    });

    const total = positiveScore + negativeScore;
    const tone = total === 0 ? 'neutral' : positiveScore > negativeScore ? 'positive' : 'negative';

    const imbalance = total > 0 ? Math.abs(positiveScore - negativeScore) / total : 0;

    return {
      tone,
      imbalance,
      positiveScore,
      negativeScore,
      assessment: imbalance > 0.6 ? 'strongly_biased' : imbalance > 0.3 ? 'moderately_biased' : 'balanced',
    };
  }

  /**
   * Detect framing bias
   */
  detectFramingBias(text) {
    const lower = text.toLowerCase();
    const framingScores = {};

    Object.entries(this.biasPatterns.framing).forEach(([frame, terms]) => {
      let score = 0;
      terms.forEach(term => {
        const regex = new RegExp(`\\b${term}\\b`, 'gi');
        const matches = (lower.match(regex) || []).length;
        score += matches;
      });
      framingScores[frame] = score;
    });

    const dominantFrame = Object.entries(framingScores).reduce(
      (max, [frame, score]) => (score > max.score ? { frame, score } : max),
      { frame: 'neutral', score: 0 }
    );

    return {
      frames: framingScores,
      dominantFrame: dominantFrame.frame,
      dominantScore: dominantFrame.score,
      assessment: dominantFrame.score > 5 ? 'strong_framing' : dominantFrame.score > 2 ? 'moderate_framing' : 'minimal_framing',
    };
  }

  /**
   * Detect selection bias (what's included/excluded)
   */
  detectSelectionBias(text, metadata) {
    const indicators = [];

    // Check for one-sided presentation
    const hasMultiplePerspectives = /\b(however|on the other hand|alternatively|critics say)\b/i.test(text);

    if (!hasMultiplePerspectives && text.length > 500) {
      indicators.push('lacks_alternative_perspectives');
    }

    // Check for cherry-picking indicators
    if (/\b(only|just|merely|solely)\b/gi.test(text)) {
      indicators.push('potentially_selective_facts');
    }

    const score = indicators.length * 0.3;

    return {
      score: Math.min(score, 1),
      indicators,
      hasMultiplePerspectives,
      assessment: score > 0.6 ? 'significant_selection_bias' : score > 0.3 ? 'some_selection_bias' : 'balanced_selection',
    };
  }

  /**
   * Analyze source selection bias
   */
  analyzeSourceSelection(sources) {
    if (!sources || sources.length === 0) {
      return {
        score: 0.5,
        diverse: false,
        assessment: 'no_sources_provided',
      };
    }

    // Check source diversity (simplified)
    const uniqueDomains = new Set(sources.map(s => this.extractDomain(s.url || s)));
    const diversityRatio = uniqueDomains.size / sources.length;

    // Check for ideological diversity (would need source database in production)
    const diverse = diversityRatio > 0.7;

    const score = diverse ? 0.2 : 0.6;

    return {
      score,
      diverse,
      sourceCount: sources.length,
      uniqueSourceCount: uniqueDomains.size,
      assessment: diverse ? 'diverse_sources' : 'limited_source_diversity',
    };
  }

  /**
   * Extract domain from URL
   */
  extractDomain(url) {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return url;
    }
  }

  /**
   * Calculate overall bias score
   */
  calculateOverallBias(biases) {
    const weights = {
      politicalBias: 0.25,
      toneBias: 0.20,
      framingBias: 0.25,
      selectionBias: 0.15,
      sourceSelection: 0.15,
    };

    let score = 0;

    score += biases.politicalBias.strength * weights.politicalBias;
    score += biases.toneBias.imbalance * weights.toneBias;
    score += (biases.framingBias.dominantScore > 0 ? 0.7 : 0.3) * weights.framingBias;
    score += biases.selectionBias.score * weights.selectionBias;
    score += biases.sourceSelection.score * weights.sourceSelection;

    return Math.min(score, 1);
  }

  /**
   * Get bias level category
   */
  getBiasLevel(score) {
    if (score >= 0.7) return 'highly_biased';
    if (score >= 0.5) return 'moderately_biased';
    if (score >= 0.3) return 'slightly_biased';
    return 'minimal_bias';
  }

  /**
   * Get recommendations
   */
  getRecommendations(biasScore) {
    const recommendations = [];

    if (biasScore >= 0.7) {
      recommendations.push('Content shows significant bias - seek alternative perspectives');
      recommendations.push('Verify facts from multiple diverse sources');
    } else if (biasScore >= 0.5) {
      recommendations.push('Content shows moderate bias - be aware of framing');
      recommendations.push('Look for coverage from sources with different perspectives');
    } else if (biasScore >= 0.3) {
      recommendations.push('Content shows some bias - consider different viewpoints');
    } else {
      recommendations.push('Content appears relatively balanced');
    }

    recommendations.push('Always think critically about all content');

    return recommendations;
  }

  async shutdown() {
    console.log(`🛑 Shutting down ${this.name}...`);
    this.initialized = false;
  }
}

module.exports = new BiasDetectionAgent();
