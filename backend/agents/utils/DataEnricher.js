// Data Enrichment Utility - Correlate and enrich data from multiple sources
// Provides intelligence layer for cross-referencing information

class DataEnricher {
  constructor() {
    this.enrichmentStrategies = new Map();
    this.correlationRules = [];
  }

  /**
   * Enrich app data with external sources
   * @param {Object} appData - Base app data
   * @param {Object} externalData - External data sources
   * @returns {Object} - Enriched data
   */
  enrichAppData(appData, externalData) {
    const enriched = { ...appData };

    // Enrich with social media data
    if (externalData.social) {
      enriched.social_metrics = this.calculateSocialMetrics(externalData.social);
      enriched.reputation_indicators = this.extractReputationIndicators(externalData.social);
    }

    // Enrich with financial data
    if (externalData.financial) {
      enriched.funding_status = this.categorizeFundingStatus(externalData.financial);
      enriched.investor_risk_level = this.assessInvestorRisk(externalData.financial);
    }

    // Enrich with developer data
    if (externalData.developer) {
      enriched.developer_trust_score = this.calculateDeveloperTrust(externalData.developer);
      enriched.experience_level = this.categorizeExperience(externalData.developer);
    }

    // Cross-correlate data points
    enriched.correlations = this.findCorrelations(externalData);

    // Detect anomalies
    enriched.anomalies = this.detectAnomalies(appData, externalData);

    return enriched;
  }

  /**
   * Calculate social media metrics
   * @param {Object} socialData - Social media data
   * @returns {Object} - Social metrics
   */
  calculateSocialMetrics(socialData) {
    const metrics = {
      total_mentions: 0,
      engagement_score: 0,
      reach_estimate: 0,
      platforms_present: 0
    };

    if (!socialData.platforms) return metrics;

    for (const platform of socialData.platforms) {
      metrics.total_mentions += platform.mentions || 0;
      metrics.engagement_score += (platform.likes || 0) + (platform.shares || 0) * 2;
      metrics.reach_estimate += platform.followers || 0;
    }

    metrics.platforms_present = socialData.platforms.length;
    metrics.engagement_rate = metrics.total_mentions > 0
      ? metrics.engagement_score / metrics.total_mentions
      : 0;

    return metrics;
  }

  /**
   * Extract reputation indicators from social data
   * @param {Object} socialData - Social media data
   * @returns {Object} - Reputation indicators
   */
  extractReputationIndicators(socialData) {
    const indicators = {
      verified_accounts: [],
      community_trust: 'unknown',
      controversy_level: 'none',
      responsiveness: 'unknown'
    };

    if (!socialData.evidence) return indicators;

    // Check for verified accounts
    indicators.verified_accounts = socialData.evidence
      .filter(e => e.author_verified)
      .map(e => e.platform);

    // Calculate controversy level
    const controversialCount = socialData.evidence.filter(e =>
      e.sentiment === 'controversial'
    ).length;

    const totalEvidence = socialData.evidence.length;
    const controversyRatio = totalEvidence > 0 ? controversialCount / totalEvidence : 0;

    if (controversyRatio > 0.3) indicators.controversy_level = 'high';
    else if (controversyRatio > 0.15) indicators.controversy_level = 'medium';
    else if (controversyRatio > 0.05) indicators.controversy_level = 'low';
    else indicators.controversy_level = 'none';

    // Assess community trust from sentiment
    const positiveCount = socialData.evidence.filter(e => e.sentiment === 'positive').length;
    const negativeCount = socialData.evidence.filter(e => e.sentiment === 'negative').length;

    if (positiveCount > negativeCount * 2) indicators.community_trust = 'high';
    else if (positiveCount > negativeCount) indicators.community_trust = 'moderate';
    else if (negativeCount > positiveCount) indicators.community_trust = 'low';
    else indicators.community_trust = 'mixed';

    return indicators;
  }

  /**
   * Categorize funding status
   * @param {Object} financialData - Financial data
   * @returns {string} - Funding category
   */
  categorizeFundingStatus(financialData) {
    if (!financialData.funding) return 'unknown';

    const funding = financialData.funding;

    if (!funding.totalRaised || funding.totalRaised === 'Bootstrapped') {
      return 'bootstrapped';
    }

    // Parse funding amount
    const amount = this.parseFundingAmount(funding.totalRaised);

    if (amount >= 100000000) return 'late_stage'; // $100M+
    if (amount >= 10000000) return 'growth_stage'; // $10M+
    if (amount >= 1000000) return 'early_stage'; // $1M+
    if (amount > 0) return 'seed'; // Any funding
    return 'bootstrapped';
  }

  /**
   * Parse funding amount from string
   * @param {string} fundingStr - Funding string (e.g., "$50M")
   * @returns {number} - Amount in dollars
   */
  parseFundingAmount(fundingStr) {
    if (!fundingStr) return 0;

    const str = fundingStr.toUpperCase();
    let multiplier = 1;

    if (str.includes('B')) multiplier = 1000000000;
    else if (str.includes('M')) multiplier = 1000000;
    else if (str.includes('K')) multiplier = 1000;

    const number = parseFloat(str.replace(/[^0-9.]/g, ''));
    return number * multiplier;
  }

  /**
   * Assess investor risk level
   * @param {Object} financialData - Financial data
   * @returns {string} - Risk level
   */
  assessInvestorRisk(financialData) {
    if (!financialData.funding || !financialData.funding.investors) {
      return 'unknown';
    }

    const investors = financialData.funding.investors;
    let riskScore = 0;
    let riskFactors = [];

    for (const investor of investors) {
      // Low reputation investors are risky
      if (investor.reputation_score < 50) {
        riskScore += 20;
        riskFactors.push(`Low reputation investor: ${investor.name}`);
      }

      // Ethical concerns are risky
      if (investor.ethical_concerns && investor.ethical_concerns.length > 0) {
        riskScore += 30;
        riskFactors.push(`Ethical concerns: ${investor.name}`);
      }

      // Foreign investors (non-US/EU) may have different regulations
      if (investor.country && !['USA', 'UK', 'Germany', 'France', 'Canada'].includes(investor.country)) {
        riskScore += 10;
      }
    }

    if (riskScore >= 50) return 'high';
    if (riskScore >= 25) return 'medium';
    if (riskScore > 0) return 'low';
    return 'minimal';
  }

  /**
   * Calculate developer trust score
   * @param {Object} developerData - Developer data
   * @returns {number} - Trust score (0-100)
   */
  calculateDeveloperTrust(developerData) {
    let score = 50; // Start neutral

    if (!developerData.experience) return score;

    const exp = developerData.experience;

    // Years active bonus
    if (exp.years_active >= 10) score += 20;
    else if (exp.years_active >= 5) score += 10;
    else if (exp.years_active >= 2) score += 5;

    // Previous apps track record
    if (exp.previous_apps && exp.previous_apps.length > 0) {
      const avgRating = exp.previous_apps.reduce((sum, app) => sum + (app.rating || 0), 0) / exp.previous_apps.length;
      if (avgRating >= 4.5) score += 15;
      else if (avgRating >= 4.0) score += 10;
      else if (avgRating >= 3.5) score += 5;
      else if (avgRating < 3.0) score -= 10;
    }

    // Code quality bonus
    if (developerData.code_quality) {
      const quality = developerData.code_quality;
      if (quality.github_stars > 1000) score += 10;
      if (quality.code_review_score > 80) score += 5;
      if (quality.open_source_contributions) score += 5;
    }

    // Incident history penalty
    if (developerData.incident_history) {
      const incidents = developerData.incident_history;
      score -= (incidents.security_breaches || 0) * 15;
      score -= (incidents.privacy_violations || 0) * 20;
      score -= (incidents.lawsuits || 0) * 10;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Categorize developer experience level
   * @param {Object} developerData - Developer data
   * @returns {string} - Experience category
   */
  categorizeExperience(developerData) {
    if (!developerData.experience) return 'unknown';

    const years = developerData.experience.years_active || 0;
    const apps = developerData.experience.previous_apps?.length || 0;

    if (years >= 10 && apps >= 5) return 'expert';
    if (years >= 5 && apps >= 3) return 'experienced';
    if (years >= 2 || apps >= 1) return 'intermediate';
    if (years >= 1) return 'beginner';
    return 'novice';
  }

  /**
   * Find correlations between different data sources
   * @param {Object} externalData - All external data
   * @returns {Array} - Correlation findings
   */
  findCorrelations(externalData) {
    const correlations = [];

    // Correlation: High funding + low social presence = suspicious
    if (externalData.financial && externalData.social) {
      const fundingStage = this.categorizeFundingStatus(externalData.financial);
      const socialPresence = externalData.social.presence_score || 0;

      if (['growth_stage', 'late_stage'].includes(fundingStage) && socialPresence < 40) {
        correlations.push({
          type: 'mismatch',
          category: 'funding_social',
          description: 'High funding but low social presence - unusual pattern',
          confidence: 0.75
        });
      }
    }

    // Correlation: New developer + high download count = suspicious
    if (externalData.developer && externalData.app) {
      const experience = this.categorizeExperience(externalData.developer);
      const downloads = externalData.app.download_count || 0;

      if (experience === 'novice' && downloads > 1000000) {
        correlations.push({
          type: 'anomaly',
          category: 'developer_popularity',
          description: 'New developer with unusually high download count',
          confidence: 0.65
        });
      }
    }

    // Correlation: Poor security score + high financial investment = concern
    if (externalData.security && externalData.financial) {
      const securityScore = externalData.security.security_score || 50;
      const fundingStage = this.categorizeFundingStatus(externalData.financial);

      if (securityScore < 40 && ['growth_stage', 'late_stage'].includes(fundingStage)) {
        correlations.push({
          type: 'concern',
          category: 'security_funding',
          description: 'Well-funded app with poor security - concerning priorities',
          confidence: 0.80
        });
      }
    }

    return correlations;
  }

  /**
   * Detect anomalies in data
   * @param {Object} appData - App data
   * @param {Object} externalData - External data
   * @returns {Array} - Detected anomalies
   */
  detectAnomalies(appData, externalData) {
    const anomalies = [];

    // Anomaly: Massive review spike
    if (externalData.reviews) {
      const recentReviews = externalData.reviews.recent_count || 0;
      const totalReviews = externalData.reviews.total || 0;

      if (totalReviews > 50 && recentReviews > totalReviews * 0.5) {
        anomalies.push({
          type: 'review_spike',
          severity: 'major',
          description: `Suspicious review spike: ${recentReviews} reviews in short period`,
          recommendation: 'Investigate for fake review campaign'
        });
      }
    }

    // Anomaly: Perfect score with many reviews
    if (appData.average_rating === 5.0 && appData.review_count > 100) {
      anomalies.push({
        type: 'perfect_score',
        severity: 'minor',
        description: 'Unusually perfect score with many reviews',
        recommendation: 'Verify review authenticity'
      });
    }

    // Anomaly: No social presence but high popularity
    if (externalData.social) {
      const socialScore = externalData.social.presence_score || 0;
      const downloads = appData.download_count || 0;

      if (socialScore < 30 && downloads > 500000) {
        anomalies.push({
          type: 'social_mismatch',
          severity: 'minor',
          description: 'High download count but minimal social media presence',
          recommendation: 'Verify download count authenticity'
        });
      }
    }

    return anomalies;
  }

  /**
   * Generate insight summary from enriched data
   * @param {Object} enrichedData - Enriched app data
   * @returns {Object} - Insight summary
   */
  generateInsights(enrichedData) {
    const insights = {
      strengths: [],
      weaknesses: [],
      opportunities: [],
      threats: []
    };

    // Analyze strengths
    if (enrichedData.developer_trust_score > 70) {
      insights.strengths.push('Trusted developer with strong track record');
    }

    if (enrichedData.social_metrics?.engagement_rate > 0.5) {
      insights.strengths.push('High community engagement on social media');
    }

    if (enrichedData.funding_status === 'growth_stage' || enrichedData.funding_status === 'late_stage') {
      insights.strengths.push('Well-funded with financial stability');
    }

    // Analyze weaknesses
    if (enrichedData.investor_risk_level === 'high') {
      insights.weaknesses.push('High-risk investors with ethical concerns');
    }

    if (enrichedData.anomalies && enrichedData.anomalies.length > 0) {
      insights.weaknesses.push(`${enrichedData.anomalies.length} data anomalies detected`);
    }

    if (enrichedData.reputation_indicators?.controversy_level === 'high') {
      insights.weaknesses.push('High controversy level in social discussions');
    }

    // Analyze opportunities
    if (enrichedData.experience_level === 'intermediate' && enrichedData.funding_status === 'early_stage') {
      insights.opportunities.push('Growing developer with early funding - potential for improvement');
    }

    // Analyze threats
    if (enrichedData.correlations && enrichedData.correlations.length > 0) {
      const concerns = enrichedData.correlations.filter(c => c.type === 'concern');
      if (concerns.length > 0) {
        insights.threats.push(`${concerns.length} concerning data correlation(s) found`);
      }
    }

    return insights;
  }
}

module.exports = DataEnricher;
