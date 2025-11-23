// Agent Orchestrator - Coordinates execution of all research agents
// Manages agent lifecycle, dependencies, and result aggregation

const ReviewAnalysisAgent = require('./ReviewAnalysisAgent');
const SocialMediaAgent = require('./SocialMediaAgent');
const FinancialTrackerAgent = require('./FinancialTrackerAgent');
// Future agents:
// const DeveloperProfileAgent = require('./DeveloperProfileAgent');
// const SecurityAnalyzerAgent = require('./SecurityAnalyzerAgent');

class AgentOrchestrator {
  constructor() {
    this.agents = {};
    this.registerAgents();
  }

  /**
   * Register all available agents
   */
  registerAgents() {
    this.agents.reviews = new ReviewAnalysisAgent();
    this.agents.social = new SocialMediaAgent();
    this.agents.financial = new FinancialTrackerAgent();
    // this.agents.developer = new DeveloperProfileAgent();
    // this.agents.security = new SecurityAnalyzerAgent();

    console.log(`✅ Registered ${Object.keys(this.agents).length} agents`);
  }

  /**
   * Run full analysis with all agents
   * @param {Object} context - {appId, pool}
   * @returns {Promise<Object>} - Complete analysis results
   */
  async runFullAnalysis(context) {
    console.log(`🚀 Starting full analysis for app ${context.appId}...`);

    const startTime = Date.now();
    const results = {};
    const errors = [];

    // Run agents in parallel for speed
    const agentPromises = Object.entries(this.agents).map(async ([name, agent]) => {
      try {
        const result = await agent.run(context);
        return { name, result };
      } catch (error) {
        console.error(`❌ Agent ${name} failed:`, error);
        errors.push({ agent: name, error: error.message });
        return { name, result: { success: false, error: error.message } };
      }
    });

    const agentResults = await Promise.all(agentPromises);

    // Aggregate results
    for (const { name, result } of agentResults) {
      results[name] = result;
    }

    const duration = (Date.now() - startTime) / 1000;

    console.log(`✅ Full analysis completed in ${duration.toFixed(2)}s`);

    // Calculate composite truth score
    const truthScore = this.calculateTruthScore(results);

    // Detect red flags
    const redFlags = this.detectRedFlags(results);

    return {
      app_id: context.appId,
      overall_truth_score: truthScore.overall,
      letter_grade: truthScore.grade,
      component_scores: truthScore.components,
      analysis_results: results,
      red_flags: redFlags,
      errors,
      duration,
      completed_at: new Date().toISOString(),
      analysis_version: '2.0'
    };
  }

  /**
   * Run specific agent only
   * @param {string} agentType - Agent type ('reviews', 'social', etc.)
   * @param {Object} context - {appId, pool}
   * @returns {Promise<Object>} - Agent result
   */
  async runAgent(agentType, context) {
    const agent = this.agents[agentType];

    if (!agent) {
      throw new Error(`Unknown agent type: ${agentType}`);
    }

    console.log(`🎯 Running ${agentType} agent for app ${context.appId}...`);

    const result = await agent.run(context);

    return result;
  }

  /**
   * Calculate composite truth score from all agent results
   * @param {Object} results - Agent results
   * @returns {Object} - Truth score breakdown
   */
  calculateTruthScore(results) {
    const weights = {
      reviews: 0.25,      // 25% - HIGHEST weight
      social: 0.15,       // 15%
      financial: 0.20,    // 20%
      developer: 0.20,    // 20%
      security: 0.20      // 20%
    };

    let totalScore = 0;
    let totalWeight = 0;
    const components = {};

    // Calculate weighted score
    for (const [agentType, weight] of Object.entries(weights)) {
      const result = results[agentType];

      if (result && result.success && result.data) {
        let score = 50; // Default score

        // Extract score from each agent's result
        if (agentType === 'reviews') {
          score = result.data.authenticity_score || 50;
        } else if (agentType === 'social') {
          score = result.data.presence_score || 50;
        } else if (agentType === 'financial') {
          score = result.data.transparency_score || 50;
        }
        // Future agents:
        // else if (agentType === 'developer') {
        //   score = result.data.credibility_score || 50;
        // } else if (agentType === 'security') {
        //   score = result.data.security_score || 50;
        // }

        components[agentType] = {
          score,
          weight,
          contribution: score * weight
        };

        totalScore += score * weight;
        totalWeight += weight;
      }
    }

    // Calculate overall score
    const overall = totalWeight > 0 ? Math.round(totalScore / totalWeight) : 50;

    // Calculate letter grade
    const grade = this.calculateLetterGrade(overall);

    return {
      overall,
      grade,
      components
    };
  }

  /**
   * Calculate letter grade from score
   * @param {number} score - Score (0-100)
   * @returns {string} - Letter grade
   */
  calculateLetterGrade(score) {
    if (score >= 95) return 'A+';
    if (score >= 90) return 'A';
    if (score >= 85) return 'B+';
    if (score >= 80) return 'B';
    if (score >= 75) return 'C+';
    if (score >= 70) return 'C';
    if (score >= 65) return 'D+';
    if (score >= 60) return 'D';
    return 'F';
  }

  /**
   * Detect red flags from all agent results
   * @param {Object} results - Agent results
   * @returns {Array} - Red flags
   */
  detectRedFlags(results) {
    const redFlags = [];

    // Check review analysis for red flags
    if (results.reviews && results.reviews.success) {
      const reviewData = results.reviews.data;

      // Critical: High percentage of fake reviews
      if (reviewData.suspicious_reviews > reviewData.total_reviews_analyzed * 0.5) {
        redFlags.push({
          severity: 'critical',
          category: 'reviews',
          title: 'Massive Fake Review Campaign Detected',
          description: `Over 50% of reviews (${reviewData.suspicious_reviews}/${reviewData.total_reviews_analyzed}) are suspicious or fake`,
          score_impact: -40
        });
      }

      // Major: Significant paid endorsements
      if (reviewData.paid_endorsements_detected > 10) {
        redFlags.push({
          severity: 'major',
          category: 'reviews',
          title: 'Paid Endorsements Detected',
          description: `Found ${reviewData.paid_endorsements_detected} paid endorsements`,
          score_impact: -20
        });
      }

      // Major: Astroturfing detected
      if (reviewData.bias_indicators.astroturfing_likelihood > 0.5) {
        redFlags.push({
          severity: 'major',
          category: 'reviews',
          title: 'Astroturfing Campaign Likely',
          description: `High likelihood (${Math.round(reviewData.bias_indicators.astroturfing_likelihood * 100)}%) of organized fake review campaign`,
          score_impact: -25
        });
      }

      // Minor: Timing cluster
      if (reviewData.bias_indicators.timing_cluster_detected) {
        redFlags.push({
          severity: 'minor',
          category: 'reviews',
          title: 'Suspicious Review Timing',
          description: 'Detected suspicious burst of reviews in short time period',
          score_impact: -10
        });
      }
    }

    // Social media red flags
    if (results.social && results.social.success) {
      const socialData = results.social.data;

      if (socialData.controversy_flags && socialData.controversy_flags.length > 0) {
        for (const controversy of socialData.controversy_flags) {
          redFlags.push({
            severity: 'major',
            category: 'social_media',
            title: 'Social Media Controversy',
            description: controversy,
            score_impact: -15
          });
        }
      }

      if (socialData.community_sentiment === 'very_negative') {
        redFlags.push({
          severity: 'major',
          category: 'social_media',
          title: 'Highly Negative Community Sentiment',
          description: 'Overwhelmingly negative sentiment across social platforms',
          score_impact: -20
        });
      }
    }

    // Financial red flags
    if (results.financial && results.financial.success) {
      const financialData = results.financial.data;

      if (financialData.red_flags && financialData.red_flags.length > 0) {
        redFlags.push(...financialData.red_flags);
      }
    }

    // TODO: Developer red flags
    // TODO: Security red flags

    return redFlags;
  }

  /**
   * Save analysis results to database
   * @param {Object} pool - Database pool
   * @param {Object} analysis - Full analysis results
   * @returns {Promise<Object>} - Saved record
   */
  async saveAnalysis(pool, analysis) {
    try {
      // Save to app_truth_analysis table
      const result = await pool.query(
        `INSERT INTO app_truth_analysis
         (app_id, overall_truth_score, letter_grade,
          social_presence_score, financial_transparency_score,
          review_authenticity_score, developer_credibility_score,
          security_privacy_score,
          social_analysis, financial_analysis, review_analysis,
          developer_analysis, security_analysis,
          red_flags, warning_count, confidence_level,
          last_analyzed_at, analysis_version)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
         ON CONFLICT (app_id)
         DO UPDATE SET
           overall_truth_score = $2,
           letter_grade = $3,
           social_presence_score = $4,
           financial_transparency_score = $5,
           review_authenticity_score = $6,
           developer_credibility_score = $7,
           security_privacy_score = $8,
           social_analysis = $9,
           financial_analysis = $10,
           review_analysis = $11,
           developer_analysis = $12,
           security_analysis = $13,
           red_flags = $14,
           warning_count = $15,
           confidence_level = $16,
           last_analyzed_at = $17,
           analysis_version = $18,
           updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [
          analysis.app_id,
          analysis.overall_truth_score,
          analysis.letter_grade,
          analysis.component_scores.social?.score || null,
          analysis.component_scores.financial?.score || null,
          analysis.component_scores.reviews?.score || null,
          analysis.component_scores.developer?.score || null,
          analysis.component_scores.security?.score || null,
          JSON.stringify(analysis.analysis_results.social?.data || {}),
          JSON.stringify(analysis.analysis_results.financial?.data || {}),
          JSON.stringify(analysis.analysis_results.reviews?.data || {}),
          JSON.stringify(analysis.analysis_results.developer?.data || {}),
          JSON.stringify(analysis.analysis_results.security?.data || {}),
          JSON.stringify(analysis.red_flags),
          analysis.red_flags.length,
          90, // Confidence level (would be calculated based on data quality)
          analysis.completed_at,
          analysis.analysis_version
        ]
      );

      console.log(`💾 Saved analysis results for app ${analysis.app_id}`);

      // Save red flags to red_flags table
      for (const flag of analysis.red_flags) {
        await this.saveRedFlag(pool, analysis.app_id, flag);
      }

      return result.rows[0];
    } catch (error) {
      console.error('Error saving analysis:', error.message);
      // Table might not exist yet
      return analysis;
    }
  }

  /**
   * Save individual red flag
   * @param {Object} pool - Database pool
   * @param {string} appId - App ID
   * @param {Object} flag - Red flag object
   * @returns {Promise<Object>} - Saved flag
   */
  async saveRedFlag(pool, appId, flag) {
    try {
      const result = await pool.query(
        `INSERT INTO red_flags
         (app_id, severity, category, title, description, score_impact, detected_at, detected_by_agent)
         VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, $7)
         RETURNING *`,
        [
          appId,
          flag.severity,
          flag.category,
          flag.title,
          flag.description,
          flag.score_impact,
          'AgentOrchestrator'
        ]
      );

      return result.rows[0];
    } catch (error) {
      console.error('Error saving red flag:', error.message);
      return flag;
    }
  }
}

module.exports = AgentOrchestrator;
