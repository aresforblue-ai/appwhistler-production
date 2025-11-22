// backend/agents/misinformationDetectionAgent.js
// AI agent for detecting misinformation, disinformation, and false claims

class MisinformationDetectionAgent {
  constructor() {
    this.name = 'MisinformationDetectionAgent';
    this.version = '1.0.0';
    this.initialized = false;
    this.totalProcessed = 0;
    this.lastUsed = null;

    // Misinformation indicators
    this.indicators = {
      sensational_headlines: [
        /shocking/i,
        /you won't believe/i,
        /doctors hate/i,
        /secret/i,
        /revealed/i,
      ],
      absolute_claims: /\b(never|always|all|none|every|completely|totally|absolutely)\b/gi,
      conspiracy_markers: [
        /cover.?up/i,
        /they don't want you to know/i,
        /wake up/i,
        /do your own research/i,
      ],
      unverified_sources: /\b(sources say|reportedly|allegedly|rumor|claim)\b/gi,
      urgency_pressure: /\b(urgent|now|immediately|today only|act fast)\b/gi,
    };

    // Known misinformation topics (expandable)
    this.misinformationTopics = new Set([
      'vaccine-autism',
      'flat-earth',
      '5g-coronavirus',
      'microchip-vaccine',
      'chemtrails',
    ]);
  }

  async initialize() {
    console.log(`🤖 Initializing ${this.name}...`);
    // Load misinformation detection models
    this.initialized = true;
    return { status: 'ready', agent: this.name };
  }

  /**
   * Detect misinformation in content
   * @param {Object} content - The content to analyze
   * @param {Object} options - Detection options
   * @returns {Object} Misinformation detection result
   */
  async process(content, options = {}) {
    const { text, title, source, claims = [] } = content;

    if (!text && !title) {
      throw new Error('No content provided for analysis');
    }

    const fullText = `${title || ''} ${text || ''}`;

    // Detect various misinformation indicators
    const sensationalScore = this.detectSensationalism(fullText);
    const absoluteClaimsScore = this.detectAbsoluteClaims(fullText);
    const conspiracyScore = this.detectConspiracyLanguage(fullText);
    const sourceCredibility = this.assessSourceCredibility(source);
    const verificationCheck = this.checkVerification(fullText);
    const topicCheck = this.checkKnownMisinformation(fullText);

    // Calculate overall misinformation risk score
    const riskScore = this.calculateRiskScore({
      sensationalScore,
      absoluteClaimsScore,
      conspiracyScore,
      sourceCredibility,
      verificationCheck,
      topicCheck,
    });

    const isMisinformation = riskScore >= 0.7;
    const requiresFactCheck = riskScore >= 0.4;

    this.totalProcessed++;
    this.lastUsed = new Date().toISOString();

    return {
      isMisinformation,
      requiresFactCheck,
      riskScore,
      confidence: this.calculateConfidence(source, claims),
      indicators: {
        sensationalism: sensationalScore,
        absoluteClaims: absoluteClaimsScore,
        conspiracy: conspiracyScore,
        sourceCredibility,
        verification: verificationCheck,
        knownTopic: topicCheck,
      },
      warnings: this.generateWarnings(riskScore, topicCheck),
      recommendations: this.getRecommendations(riskScore),
      analyzedAt: new Date().toISOString(),
    };
  }

  /**
   * Detect sensationalism in text
   */
  detectSensationalism(text) {
    let score = 0;
    const detections = [];

    this.indicators.sensational_headlines.forEach(pattern => {
      if (pattern.test(text)) {
        score += 0.2;
        detections.push(pattern.source);
      }
    });

    // Check for excessive punctuation
    const exclamationCount = (text.match(/!/g) || []).length;
    if (exclamationCount > 3) {
      score += 0.15;
      detections.push('excessive_punctuation');
    }

    // Check for all caps words
    const allCapsWords = (text.match(/\b[A-Z]{4,}\b/g) || []).length;
    if (allCapsWords > 2) {
      score += 0.1;
      detections.push('excessive_caps');
    }

    return {
      score: Math.min(score, 1),
      detections,
      level: score >= 0.6 ? 'high' : score >= 0.3 ? 'medium' : 'low',
    };
  }

  /**
   * Detect absolute claims
   */
  detectAbsoluteClaims(text) {
    const matches = text.match(this.indicators.absolute_claims) || [];
    const score = Math.min(matches.length * 0.1, 1);

    return {
      score,
      count: matches.length,
      terms: [...new Set(matches.map(m => m.toLowerCase()))],
      level: score >= 0.5 ? 'high' : score >= 0.3 ? 'medium' : 'low',
    };
  }

  /**
   * Detect conspiracy theory language
   */
  detectConspiracyLanguage(text) {
    let score = 0;
    const detections = [];

    this.indicators.conspiracy_markers.forEach(pattern => {
      if (pattern.test(text)) {
        score += 0.3;
        detections.push(pattern.source);
      }
    });

    return {
      score: Math.min(score, 1),
      detections,
      level: score >= 0.6 ? 'high' : score >= 0.3 ? 'medium' : 'low',
    };
  }

  /**
   * Assess source credibility
   */
  assessSourceCredibility(source) {
    if (!source) {
      return {
        score: 0.3,
        credible: false,
        reason: 'no_source_provided',
      };
    }

    // Check against known credible/unreliable sources
    // In production, integrate with source credibility database

    const isCredible = /\b(reuters|ap|bbc|npr)\b/i.test(source);
    const isUnreliable = /\b(fakenews|clickbait)\b/i.test(source);

    let score = 0.5;

    if (isCredible) score = 0.9;
    if (isUnreliable) score = 0.1;

    return {
      score,
      credible: score >= 0.6,
      source,
    };
  }

  /**
   * Check for verification language
   */
  checkVerification(text) {
    const unverifiedMatches = (text.match(this.indicators.unverified_sources) || []).length;
    const verifiedMatches = (text.match(/\b(verified|confirmed|fact.?checked|peer.?reviewed)\b/gi) || []).length;

    const score = verifiedMatches > 0 ? 0.8 : unverifiedMatches > 2 ? 0.2 : 0.5;

    return {
      score,
      unverifiedCount: unverifiedMatches,
      verifiedCount: verifiedMatches,
      verified: score >= 0.6,
    };
  }

  /**
   * Check against known misinformation topics
   */
  checkKnownMisinformation(text) {
    const lower = text.toLowerCase();
    const matches = [];

    this.misinformationTopics.forEach(topic => {
      const topicWords = topic.split('-');
      if (topicWords.every(word => lower.includes(word))) {
        matches.push(topic);
      }
    });

    return {
      isKnownTopic: matches.length > 0,
      topics: matches,
      score: matches.length > 0 ? 0.9 : 0,
    };
  }

  /**
   * Calculate overall risk score
   */
  calculateRiskScore(indicators) {
    const weights = {
      sensationalScore: 0.15,
      absoluteClaimsScore: 0.15,
      conspiracyScore: 0.25,
      sourceCredibility: 0.20,
      verificationCheck: 0.15,
      topicCheck: 0.10,
    };

    let score = 0;

    score += indicators.sensationalScore.score * weights.sensationalScore;
    score += indicators.absoluteClaimsScore.score * weights.absoluteClaimsScore;
    score += indicators.conspiracyScore.score * weights.conspiracyScore;
    score += (1 - indicators.sourceCredibility.score) * weights.sourceCredibility; // Invert
    score += (1 - indicators.verificationCheck.score) * weights.verificationCheck; // Invert
    score += indicators.topicCheck.score * weights.topicCheck;

    return Math.min(score, 1);
  }

  /**
   * Calculate confidence in detection
   */
  calculateConfidence(source, claims) {
    let confidence = 0.5;

    if (source) confidence += 0.2;
    if (claims && claims.length > 0) confidence += 0.3;

    return Math.min(confidence, 1);
  }

  /**
   * Generate warnings
   */
  generateWarnings(riskScore, topicCheck) {
    const warnings = [];

    if (riskScore >= 0.7) {
      warnings.push('High risk of misinformation detected');
    }

    if (topicCheck.isKnownTopic) {
      warnings.push(`Content related to known misinformation topic: ${topicCheck.topics.join(', ')}`);
    }

    if (riskScore >= 0.5 && riskScore < 0.7) {
      warnings.push('Moderate misinformation risk - verify claims independently');
    }

    return warnings;
  }

  /**
   * Get recommendations
   */
  getRecommendations(riskScore) {
    const recommendations = [];

    if (riskScore >= 0.7) {
      recommendations.push('Do not share this content');
      recommendations.push('Cross-check claims with credible sources');
      recommendations.push('Report to platform moderators');
    } else if (riskScore >= 0.4) {
      recommendations.push('Verify claims before sharing');
      recommendations.push('Check source credibility');
      recommendations.push('Look for fact-checks on this topic');
    } else {
      recommendations.push('Content appears reliable but verify important claims');
    }

    return recommendations;
  }

  async shutdown() {
    console.log(`🛑 Shutting down ${this.name}...`);
    this.initialized = false;
  }
}

module.exports = new MisinformationDetectionAgent();
