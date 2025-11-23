/**
 * AppWhistler Multi-Agent Orchestrator v2.0
 * Integrates 6+ external detection systems as pluggable agents
 *
 * Architecture:
 * - Core agents (existing): 5 layers we built
 * - External agents: 6 open-source tools integrated
 * - Hybrid scoring: Weighted combination
 * - Evidence provenance: Track which agent found what
 */

const axios = require('axios');
const logger = require('./logger');

// Import external agent integrations
const { classifyReview: classifyWithSayam } = require('../integrations/sayamalt-svm');
const { analyzeReview: analyzeWithVader } = require('../integrations/thedeveloper-vader');
const { analyzeWithBERT } = require('../integrations/immanuelsandeep-bert');
const { analyzeWithCheckup } = require('../integrations/checkup-scraper');
const { analyzeAppMedia } = require('../integrations/kitware-osint');
const { analyzeAppDescription } = require('../integrations/cofacts-crowdsource');

// ============================================================================
// AGENT REGISTRY - All Available Agents
// ============================================================================

const AGENT_REGISTRY = {
  // ===== CORE AGENTS (Already Built) =====
  core: {
    pattern: {
      name: 'Pattern Analysis',
      weight: 0.15,
      handler: require('./fakeReviewDetector').analyzeTimingPatterns,
      type: 'INTERNAL'
    },
    nlp: {
      name: 'NLP Analysis',
      weight: 0.20,
      handler: require('./fakeReviewDetector').analyzeReviewText,
      type: 'INTERNAL'
    },
    behavior: {
      name: 'Behavioral Signals',
      weight: 0.10,
      handler: require('./fakeReviewDetector').analyzeUserBehavior,
      type: 'INTERNAL'
    },
    network: {
      name: 'Network Analysis',
      weight: 0.10,
      handler: require('./fakeReviewDetector').detectReviewNetworks,
      type: 'INTERNAL'
    },
    duplicate: {
      name: 'Duplicate Detection',
      weight: 0.10,
      handler: require('./fakeReviewDetector').detectDuplicates,
      type: 'INTERNAL'
    }
  },

  // ===== EXTERNAL AGENTS (New Integrations) =====
  external: {
    sayamML: {
      name: 'SayamAlt ML Classifier',
      weight: 0.08,
      endpoint: process.env.SAYAM_ML_ENDPOINT || 'http://localhost:5001/predict',
      type: 'EXTERNAL_ML',
      description: 'SVM/Logistic Regression on TF-IDF features'
    },
    developer306: {
      name: 'Developer306 Sentiment',
      weight: 0.07,
      endpoint: process.env.DEVELOPER306_ENDPOINT || 'http://localhost:5002/analyze',
      type: 'EXTERNAL_ML',
      description: 'VADER sentiment + Random Forest'
    },
    bertTransformer: {
      name: 'BERT Transformer',
      weight: 0.10,
      endpoint: process.env.BERT_ENDPOINT || 'http://localhost:5003/classify',
      type: 'EXTERNAL_TRANSFORMER',
      description: 'Fine-tuned BERT for fake review detection (92% F1)'
    },
    cofacts: {
      name: 'Cofacts Community',
      weight: 0.05,
      endpoint: 'https://cofacts-api.g0v.tw/graphql',
      type: 'EXTERNAL_CROWDSOURCE',
      description: 'Crowdsourced fact-checking from g0v'
    },
    checkup: {
      name: 'Check-up Scraper',
      weight: 0.03,
      endpoint: process.env.CHECKUP_ENDPOINT || 'http://localhost:5004/scrape',
      type: 'EXTERNAL_SCRAPER',
      description: 'Real-time ad/claim scraping'
    },
    kitware: {
      name: 'Kitware OSINT',
      weight: 0.02,
      endpoint: process.env.KITWARE_ENDPOINT || 'http://localhost:5005/analyze',
      type: 'EXTERNAL_OSINT',
      description: 'Deepfake/media manipulation detection'
    }
  }
};

// ============================================================================
// AGENT ADAPTERS - Connect to External Services
// ============================================================================

class ExternalAgentAdapter {
  /**
   * Sayam ML Classifier Adapter
   * Uses JavaScript port of SayamAlt's SVM classifier
   */
  static async callSayamML(reviewText) {
    try {
      const result = await classifyWithSayam(reviewText);

      return {
        agentName: 'SayamML',
        confidence: result.confidence,
        verdict: result.verdict,
        evidence: result.redFlags.map(f => f.description),
        source: 'EXTERNAL_ML',
        details: result
      };
    } catch (error) {
      logger.error('[SayamML] Error:', error.message);
      return null; // Agent offline, skip gracefully
    }
  }

  /**
   * Developer306 Sentiment Adapter
   * Uses JavaScript port of VADER sentiment analysis
   */
  static async callDeveloper306(reviewText, rating) {
    try {
      const result = await analyzeWithVader(reviewText, rating);

      return {
        agentName: 'Developer306',
        confidence: result.confidence,
        verdict: result.verdict,
        sentiment: result.sentimentMismatch.sentiment,
        evidence: result.redFlags.map(f => f.description),
        source: 'EXTERNAL_ML',
        details: result
      };
    } catch (error) {
      logger.error('[Developer306] Error:', error.message);
      return null;
    }
  }

  /**
   * BERT Transformer Adapter
   * Uses JavaScript port with API fallback to BERT model
   */
  static async callBERTTransformer(reviewText) {
    try {
      const result = await analyzeWithBERT(reviewText);

      return {
        agentName: 'BERT',
        confidence: result.confidence,
        verdict: result.verdict,
        evidence: result.redFlags.map(f => f.description),
        source: 'EXTERNAL_TRANSFORMER',
        details: result
      };
    } catch (error) {
      logger.error('[BERT] Error:', error.message);
      return null;
    }
  }

  /**
   * Cofacts Community Adapter
   * Uses integration module for g0v fact-checking
   */
  static async callCofacts(claimText) {
    try {
      const result = await analyzeAppDescription(claimText);

      if (!result || result.verdict === 'NO_COMMUNITY_DATA') {
        return null; // No community data
      }

      return {
        agentName: 'Cofacts',
        confidence: result.confidence,
        verdict: result.verdict,
        evidence: result.redFlags.map(f => f.description),
        source: 'EXTERNAL_CROWDSOURCE',
        details: result
      };
    } catch (error) {
      logger.error('[Cofacts] Error:', error.message);
      return null;
    }
  }

  /**
   * Check-up Scraper Adapter
   * Uses integration module for claim scraping
   */
  static async callCheckup(url) {
    try {
      const result = await analyzeWithCheckup(url);

      return {
        agentName: 'Checkup',
        confidence: result.confidence,
        verdict: result.verdict,
        evidence: result.redFlags.map(f => f.description),
        source: 'EXTERNAL_SCRAPER',
        details: result
      };
    } catch (error) {
      logger.error('[Checkup] Error:', error.message);
      return null;
    }
  }

  /**
   * Kitware OSINT Adapter
   * Uses integration module for media manipulation detection
   */
  static async callKitware(appData) {
    try {
      const result = await analyzeAppMedia(appData);

      if (!result || result.verdict === 'NO_MEDIA_TO_ANALYZE') {
        return null;
      }

      return {
        agentName: 'Kitware',
        confidence: result.confidence,
        verdict: result.verdict,
        evidence: result.redFlags.map(f => f.description),
        source: 'EXTERNAL_OSINT',
        details: result
      };
    } catch (error) {
      logger.error('[Kitware] Error:', error.message);
      return null;
    }
  }
}

// ============================================================================
// ORCHESTRATOR - Coordinate All Agents
// ============================================================================

class MultiAgentOrchestrator {
  /**
   * Run all available agents in parallel
   * Combine results using weighted average
   */
  static async analyzeWithAllAgents(input) {
    const {
      reviewText,
      rating,
      url,
      mediaUrl,
      userContext,
      allReviews
    } = input;

    logger.info('[Orchestrator] Starting multi-agent analysis...');

    // Run all agents in parallel
    const agentPromises = [
      // Core agents (always run)
      this.runCoreAgents(reviewText, rating, userContext, allReviews),

      // External ML agents (run if available)
      ExternalAgentAdapter.callSayamML(reviewText),
      ExternalAgentAdapter.callDeveloper306(reviewText, rating),
      ExternalAgentAdapter.callBERTTransformer(reviewText),

      // Crowdsource/scraper agents
      ExternalAgentAdapter.callCofacts(reviewText),
      url ? ExternalAgentAdapter.callCheckup(url) : null,
      mediaUrl ? ExternalAgentAdapter.callKitware(mediaUrl) : null
    ];

    // Wait for all agents (with timeout fallback)
    const results = await Promise.allSettled(
      agentPromises.map(p =>
        p ? Promise.race([
          p,
          new Promise((_, reject) => setTimeout(() => reject(new Error('Agent timeout')), 20000))
        ]) : Promise.resolve(null)
      )
    );

    // Filter successful results
    const agentResults = results
      .map(r => r.status === 'fulfilled' ? r.value : null)
      .filter(Boolean);

    logger.info(`[Orchestrator] ${agentResults.length} agents responded`);

    // Calculate weighted composite score
    const compositeScore = this.calculateCompositeScore(agentResults);

    return {
      overallScore: compositeScore.score,
      verdict: compositeScore.verdict,
      agentResults: agentResults,
      consensus: this.calculateConsensus(agentResults),
      evidenceProvenance: this.buildEvidenceChain(agentResults),
      metadata: {
        totalAgentsRun: agentResults.length,
        coreAgents: agentResults.filter(a => a.source === 'INTERNAL').length,
        externalAgents: agentResults.filter(a => a.source?.startsWith('EXTERNAL')).length,
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Run core agents (our existing system)
   */
  static async runCoreAgents(reviewText, rating, userContext, allReviews) {
    const fakeDetector = require('./fakeReviewDetector');

    const review = {
      review_text: reviewText,
      rating,
      created_at: new Date(),
      user_id: userContext?.userId
    };

    const result = await fakeDetector.analyzeSingleReview(review, {
      allReviews,
      userHistory: userContext
    });

    return {
      agentName: 'CoreAgents',
      confidence: result.fakeScore,
      verdict: result.verdict,
      evidence: result.redFlags.map(f => f.description),
      source: 'INTERNAL'
    };
  }

  /**
   * Calculate composite score from all agents
   */
  static calculateCompositeScore(agentResults) {
    let totalWeight = 0;
    let weightedSum = 0;

    agentResults.forEach(result => {
      // Get agent weight from registry
      const agentConfig = Object.values(AGENT_REGISTRY.core)
        .concat(Object.values(AGENT_REGISTRY.external))
        .find(a => a.name === result.agentName || result.agentName.includes(a.name));

      const weight = agentConfig?.weight || 0.05; // Default 5% for unknown agents

      weightedSum += result.confidence * weight;
      totalWeight += weight;
    });

    const score = Math.round(weightedSum / totalWeight);

    return {
      score,
      verdict: score >= 80 ? 'HIGHLY_LIKELY_FAKE' :
               score >= 60 ? 'LIKELY_FAKE' :
               score >= 40 ? 'SUSPICIOUS' :
               score >= 20 ? 'POTENTIALLY_SUSPICIOUS' :
               'LIKELY_GENUINE'
    };
  }

  /**
   * Calculate consensus among agents
   */
  static calculateConsensus(agentResults) {
    const verdicts = agentResults.map(r => r.verdict);
    const fakeCount = verdicts.filter(v =>
      v.includes('FAKE') || v === 'SUSPICIOUS'
    ).length;

    const consensusRate = fakeCount / verdicts.length;

    return {
      rate: consensusRate,
      strongConsensus: consensusRate > 0.75 || consensusRate < 0.25,
      description: consensusRate > 0.75 ? 'Strong agreement (likely fake)' :
                   consensusRate < 0.25 ? 'Strong agreement (likely genuine)' :
                   'Mixed signals - needs human review'
    };
  }

  /**
   * Build evidence chain showing which agent found what
   */
  static buildEvidenceChain(agentResults) {
    return agentResults.map(result => ({
      agent: result.agentName,
      source: result.source,
      confidence: result.confidence,
      evidence: result.evidence,
      timestamp: new Date().toISOString()
    }));
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  MultiAgentOrchestrator,
  ExternalAgentAdapter,
  AGENT_REGISTRY
};
