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
   * Connects to SayamAlt's Flask API
   */
  static async callSayamML(reviewText) {
    try {
      const response = await axios.post(
        AGENT_REGISTRY.external.sayamML.endpoint,
        {
          review: reviewText,
          features: ['tfidf', 'word2vec']
        },
        { timeout: 5000 }
      );

      return {
        agentName: 'SayamML',
        confidence: response.data.fake_probability * 100,
        verdict: response.data.prediction === 'FAKE' ? 'LIKELY_FAKE' : 'LIKELY_GENUINE',
        evidence: response.data.features || [],
        source: 'EXTERNAL_ML'
      };
    } catch (error) {
      console.error('[SayamML] Error:', error.message);
      return null; // Agent offline, skip gracefully
    }
  }

  /**
   * Developer306 Sentiment Adapter
   * Connects to Flask sentiment analysis API
   */
  static async callDeveloper306(reviewText, rating) {
    try {
      const response = await axios.post(
        AGENT_REGISTRY.external.developer306.endpoint,
        {
          review: reviewText,
          rating: rating,
          include_sentiment: true
        },
        { timeout: 5000 }
      );

      return {
        agentName: 'Developer306',
        confidence: response.data.confidence * 100,
        verdict: response.data.is_fake ? 'LIKELY_FAKE' : 'LIKELY_GENUINE',
        sentiment: response.data.sentiment,
        evidence: [
          `Sentiment: ${response.data.sentiment.compound}`,
          `Rating consistency: ${response.data.rating_match ? 'MATCH' : 'MISMATCH'}`
        ],
        source: 'EXTERNAL_ML'
      };
    } catch (error) {
      console.error('[Developer306] Error:', error.message);
      return null;
    }
  }

  /**
   * BERT Transformer Adapter
   * Connects to ImmanuelSandeep's BERT model
   */
  static async callBERTTransformer(reviewText) {
    try {
      const response = await axios.post(
        AGENT_REGISTRY.external.bertTransformer.endpoint,
        {
          text: reviewText,
          model: 'bert-base-uncased'
        },
        { timeout: 10000 } // BERT can be slower
      );

      return {
        agentName: 'BERT',
        confidence: response.data.fake_score * 100,
        verdict: response.data.label === 'CG' ? 'HIGHLY_LIKELY_FAKE' : 'LIKELY_GENUINE',
        evidence: [
          `Computer-generated probability: ${response.data.cg_probability}`,
          `Attention weights: ${response.data.attention_summary}`
        ],
        source: 'EXTERNAL_TRANSFORMER'
      };
    } catch (error) {
      console.error('[BERT] Error:', error.message);
      return null;
    }
  }

  /**
   * Cofacts Community Adapter
   * Queries g0v crowdsourced fact-check database
   */
  static async callCofacts(claimText) {
    try {
      const query = `
        query SearchArticles($text: String!) {
          ListArticles(
            filter: { moreLikeThis: { like: $text } }
            first: 5
          ) {
            edges {
              node {
                text
                articleReplies {
                  reply {
                    type
                    text
                  }
                  status
                }
              }
            }
          }
        }
      `;

      const response = await axios.post(
        AGENT_REGISTRY.external.cofacts.endpoint,
        {
          query,
          variables: { text: claimText }
        },
        { timeout: 5000 }
      );

      const articles = response.data.data.ListArticles.edges;

      if (articles.length === 0) {
        return null; // No community data
      }

      // Check if any similar claims were marked as rumors
      const rumorCount = articles.filter(a =>
        a.node.articleReplies.some(r => r.reply.type === 'RUMOR')
      ).length;

      const confidence = (rumorCount / articles.length) * 100;

      return {
        agentName: 'Cofacts',
        confidence,
        verdict: confidence > 50 ? 'SUSPICIOUS' : 'LIKELY_GENUINE',
        evidence: articles.map(a =>
          `Community flagged: ${a.node.articleReplies[0]?.reply.text.substring(0, 100)}`
        ),
        source: 'EXTERNAL_CROWDSOURCE'
      };
    } catch (error) {
      console.error('[Cofacts] Error:', error.message);
      return null;
    }
  }

  /**
   * Check-up Scraper Adapter
   * Real-time claim scraping
   */
  static async callCheckup(url) {
    try {
      const response = await axios.post(
        AGENT_REGISTRY.external.checkup.endpoint,
        {
          url,
          scrape_ads: true,
          classify_theme: true
        },
        { timeout: 8000 }
      );

      return {
        agentName: 'Checkup',
        confidence: response.data.disinfo_score || 0,
        verdict: response.data.has_misinfo ? 'SUSPICIOUS' : 'LIKELY_GENUINE',
        evidence: response.data.flagged_claims || [],
        source: 'EXTERNAL_SCRAPER'
      };
    } catch (error) {
      console.error('[Checkup] Error:', error.message);
      return null;
    }
  }

  /**
   * Kitware OSINT Adapter
   * Deepfake and media manipulation detection
   */
  static async callKitware(mediaUrl) {
    try {
      const response = await axios.post(
        AGENT_REGISTRY.external.kitware.endpoint,
        {
          media_url: mediaUrl,
          analysis_types: ['deepfake', 'exif', 'attribution']
        },
        { timeout: 15000 } // Media analysis can be slow
      );

      return {
        agentName: 'Kitware',
        confidence: response.data.manipulation_score || 0,
        verdict: response.data.is_manipulated ? 'SUSPICIOUS' : 'LIKELY_GENUINE',
        evidence: [
          `Deepfake probability: ${response.data.deepfake_prob}`,
          `EXIF inconsistencies: ${response.data.exif_flags}`,
          `Attribution: ${response.data.attribution_source}`
        ],
        source: 'EXTERNAL_OSINT'
      };
    } catch (error) {
      console.error('[Kitware] Error:', error.message);
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

    console.log('[Orchestrator] Starting multi-agent analysis...');

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

    console.log(`[Orchestrator] ${agentResults.length} agents responded`);

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
