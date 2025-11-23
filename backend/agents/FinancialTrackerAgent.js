// Financial Tracker Agent - LEGENDARY money trail and investor analysis
// Follows funding sources, investor backgrounds, ownership transparency, revenue models
// Detects conflicts of interest, hidden ownership, and financial red flags

const BaseAgent = require('./BaseAgent');
const ApiClient = require('./utils/ApiClient');
const DataEnricher = require('./utils/DataEnricher');

class FinancialTrackerAgent extends BaseAgent {
  constructor() {
    super('FinancialTrackerAgent', '2.0');

    this.dataEnricher = new DataEnricher();

    // Initialize API clients
    this.clients = {
      // Crunchbase API for funding data
      crunchbase: new ApiClient('Crunchbase', {
        baseUrl: 'https://api.crunchbase.com/api/v4',
        rateLimit: 40,
        cacheTimeout: 3600000 // 1 hour
      }),

      // OpenCorporates API for company data
      opencorporates: new ApiClient('OpenCorporates', {
        baseUrl: 'https://api.opencorporates.com/v0.4',
        rateLimit: 500,
        cacheTimeout: 86400000 // 24 hours
      })
    };

    // High-risk investor flags
    this.riskFlags = {
      countries: ['CN', 'RU', 'KP', 'IR'], // High-risk countries
      blacklistedInvestors: [
        // Would include known problematic investors
      ],
      ethicalConcerns: [
        'human rights violations',
        'environmental damage',
        'weapons manufacturing',
        'tobacco',
        'predatory lending',
        'data privacy violations'
      ]
    };

    // Revenue model red flags
    this.revenueRedFlags = {
      undisclosed: ['data selling', 'user tracking', 'behavioral analysis'],
      deceptive: ['dark patterns', 'hidden fees', 'auto-renewal'],
      predatory: ['gambling', 'loot boxes', 'payday loans']
    };
  }

  /**
   * Main execution - comprehensive financial analysis
   * @param {Object} context - {appId, pool, appData}
   * @returns {Promise<Object>} - Financial analysis
   */
  async execute(context) {
    const { appId, pool, appData: providedAppData } = context;

    this.log('info', `Analyzing financial transparency for app ${appId}...`);

    // Fetch app data if not provided
    const appData = providedAppData || await this.fetchAppData(pool, appId);

    this.updateProgress(10);

    // Search for company information
    const companyData = await this.searchCompanyInfo(appData);

    this.updateProgress(30);

    // Get funding information
    const fundingData = await this.getFundingInfo(companyData);

    this.updateProgress(50);

    // Analyze investors
    const investorAnalysis = await this.analyzeInvestors(fundingData);

    this.updateProgress(65);

    // Verify ownership transparency
    const ownershipAnalysis = await this.analyzeOwnership(companyData, fundingData);

    this.updateProgress(80);

    // Analyze revenue model
    const revenueAnalysis = await this.analyzeRevenueModel(appData, companyData);

    this.updateProgress(90);

    // Detect financial red flags
    const redFlags = this.detectFinancialRedFlags(
      fundingData,
      investorAnalysis,
      ownershipAnalysis,
      revenueAnalysis
    );

    // Calculate transparency score
    const transparencyScore = this.calculateTransparencyScore(
      fundingData,
      investorAnalysis,
      ownershipAnalysis,
      revenueAnalysis,
      redFlags
    );

    this.updateProgress(95);

    // Save to database
    await this.saveFinancialRecords(pool, appId, {
      funding: fundingData,
      investors: investorAnalysis,
      ownership: ownershipAnalysis,
      revenue: revenueAnalysis,
      transparency_score: transparencyScore,
      red_flags: redFlags
    });

    this.updateProgress(100);

    return {
      transparency_score: transparencyScore,
      funding: fundingData,
      ownership: ownershipAnalysis,
      revenue_model: revenueAnalysis,
      investor_risk: investorAnalysis.risk_assessment,
      red_flags: redFlags,
      analysis_timestamp: new Date().toISOString()
    };
  }

  /**
   * Search for company information
   * @param {Object} appData - App data
   * @returns {Promise<Object>} - Company data
   */
  async searchCompanyInfo(appData) {
    this.log('info', `Searching company info for ${appData.developer}...`);

    const companyData = {
      name: appData.developer,
      found: false,
      official_name: null,
      country: null,
      incorporation_date: null,
      company_number: null,
      company_type: null
    };

    try {
      // Search OpenCorporates for company registration
      // Note: Requires API key in production
      // const response = await this.clients.opencorporates.request({
      //   url: '/companies/search',
      //   params: {
      //     q: appData.developer,
      //     api_token: process.env.OPENCORPORATES_API_KEY
      //   }
      // });

      // Mock data for now
      companyData.found = true;
      companyData.official_name = appData.developer;

      this.log('info', `Company found: ${companyData.official_name}`);
    } catch (error) {
      this.log('warn', `Company search failed: ${error.message}`);
    }

    return companyData;
  }

  /**
   * Get funding information from Crunchbase
   * @param {Object} companyData - Company data
   * @returns {Promise<Object>} - Funding data
   */
  async getFundingInfo(companyData) {
    this.log('info', 'Retrieving funding information...');

    const fundingData = {
      total_raised: null,
      rounds: [],
      investors: [],
      last_funding_date: null,
      funding_stage: 'unknown'
    };

    try {
      // Query Crunchbase API
      // Note: Requires paid API key
      // const response = await this.clients.crunchbase.request({
      //   url: `/entities/organizations/${companyData.company_number}`,
      //   params: {
      //     user_key: process.env.CRUNCHBASE_API_KEY
      //   }
      // });

      // Mock funding data
      // In production, would parse actual API response

      this.log('info', `Funding data retrieved: ${fundingData.total_raised || 'Unknown'}`);
    } catch (error) {
      this.log('warn', `Funding info retrieval failed: ${error.message}`);
    }

    return fundingData;
  }

  /**
   * Analyze investor backgrounds and risks
   * @param {Object} fundingData - Funding data
   * @returns {Promise<Object>} - Investor analysis
   */
  async analyzeInvestors(fundingData) {
    this.log('info', 'Analyzing investor backgrounds...');

    const analysis = {
      total_investors: fundingData.investors.length,
      investor_details: [],
      risk_assessment: {
        overall_risk: 'unknown',
        high_risk_count: 0,
        ethical_concerns: [],
        foreign_ownership: false
      }
    };

    for (const investor of fundingData.investors) {
      const investorProfile = await this.profileInvestor(investor);
      analysis.investor_details.push(investorProfile);

      // Track risks
      if (investorProfile.risk_level === 'high') {
        analysis.risk_assessment.high_risk_count++;
      }

      if (investorProfile.ethical_concerns.length > 0) {
        analysis.risk_assessment.ethical_concerns.push(...investorProfile.ethical_concerns);
      }

      if (this.riskFlags.countries.includes(investorProfile.country)) {
        analysis.risk_assessment.foreign_ownership = true;
      }
    }

    // Calculate overall risk
    if (analysis.risk_assessment.high_risk_count > 0) {
      analysis.risk_assessment.overall_risk = 'high';
    } else if (analysis.risk_assessment.ethical_concerns.length > 0) {
      analysis.risk_assessment.overall_risk = 'medium';
    } else if (analysis.total_investors > 0) {
      analysis.risk_assessment.overall_risk = 'low';
    }

    return analysis;
  }

  /**
   * Profile an individual investor
   * @param {Object} investor - Investor data
   * @returns {Promise<Object>} - Investor profile
   */
  async profileInvestor(investor) {
    const profile = {
      name: investor.name,
      type: investor.type || 'unknown', // 'vc', 'angel', 'corporate', 'government'
      country: investor.country || 'unknown',
      reputation_score: 50, // Default neutral
      ethical_concerns: [],
      risk_level: 'low',
      track_record: []
    };

    // Check against blacklist
    if (this.riskFlags.blacklistedInvestors.includes(investor.name.toLowerCase())) {
      profile.risk_level = 'high';
      profile.reputation_score = 20;
      profile.ethical_concerns.push('Blacklisted investor');
    }

    // Check country risk
    if (this.riskFlags.countries.includes(profile.country)) {
      profile.risk_level = 'high';
      profile.ethical_concerns.push(`High-risk country: ${profile.country}`);
      profile.reputation_score -= 30;
    }

    // In production, would query investor databases for:
    // - Past investments and outcomes
    // - Legal issues/scandals
    // - ESG ratings
    // - Industry focus

    return profile;
  }

  /**
   * Analyze ownership structure and transparency
   * @param {Object} companyData - Company data
   * @param {Object} fundingData - Funding data
   * @returns {Promise<Object>} - Ownership analysis
   */
  async analyzeOwnership(companyData, fundingData) {
    this.log('info', 'Analyzing ownership transparency...');

    const analysis = {
      parent_company: null,
      country: companyData.country || 'unknown',
      public_filings: companyData.found,
      ownership_type: this.determineOwnershipType(companyData, fundingData),
      beneficial_owners: [],
      transparency_level: 'unknown',
      shell_company_risk: false
    };

    // Assess transparency
    let transparencyScore = 0;

    // Public filings available
    if (companyData.found) transparencyScore += 30;

    // Known ownership structure
    if (analysis.ownership_type !== 'unknown') transparencyScore += 20;

    // Not a shell company
    if (!analysis.shell_company_risk) transparencyScore += 30;

    // Beneficial owners disclosed
    if (analysis.beneficial_owners.length > 0) transparencyScore += 20;

    if (transparencyScore >= 80) analysis.transparency_level = 'high';
    else if (transparencyScore >= 50) analysis.transparency_level = 'medium';
    else analysis.transparency_level = 'low';

    return analysis;
  }

  /**
   * Determine ownership type
   * @param {Object} companyData - Company data
   * @param {Object} fundingData - Funding data
   * @returns {string} - Ownership type
   */
  determineOwnershipType(companyData, fundingData) {
    if (companyData.company_type === 'public') return 'public';
    if (fundingData.total_raised === 'Bootstrapped') return 'bootstrapped';
    if (fundingData.investors.length > 0) return 'venture_backed';
    if (companyData.company_type === 'private') return 'private';
    return 'unknown';
  }

  /**
   * Analyze revenue model and detect deceptive practices
   * @param {Object} appData - App data
   * @param {Object} companyData - Company data
   * @returns {Promise<Object>} - Revenue analysis
   */
  async analyzeRevenueModel(appData, companyData) {
    this.log('info', 'Analyzing revenue model...');

    const analysis = {
      declared: null,
      verified: false,
      hidden_monetization: [],
      deceptive_practices: [],
      transparency_score: 50
    };

    // Extract declared revenue model from app description/privacy policy
    analysis.declared = this.extractDeclaredRevenueModel(appData);

    // Check for hidden monetization
    analysis.hidden_monetization = this.detectHiddenMonetization(appData);

    // Check for deceptive practices
    analysis.deceptive_practices = this.detectDeceptivePractices(appData);

    // Verify consistency
    analysis.verified = this.verifyRevenueModelConsistency(
      analysis.declared,
      analysis.hidden_monetization
    );

    // Calculate transparency score
    let score = 50; // Base score

    if (analysis.declared) score += 20;
    if (analysis.verified) score += 20;
    score -= analysis.hidden_monetization.length * 15;
    score -= analysis.deceptive_practices.length * 10;

    analysis.transparency_score = Math.max(0, Math.min(100, score));

    return analysis;
  }

  /**
   * Extract declared revenue model from app data
   * @param {Object} appData - App data
   * @returns {string|null} - Revenue model
   */
  extractDeclaredRevenueModel(appData) {
    const description = (appData.description || '').toLowerCase();

    if (description.includes('subscription') || description.includes('premium')) return 'subscription';
    if (description.includes('ads') || description.includes('advertising')) return 'advertising';
    if (description.includes('free')) return 'freemium';
    if (description.includes('one-time purchase')) return 'paid';

    return null;
  }

  /**
   * Detect hidden monetization methods
   * @param {Object} appData - App data
   * @returns {Array} - Hidden monetization methods
   */
  detectHiddenMonetization(appData) {
    const hidden = [];

    // Check privacy policy for data selling
    const privacyPolicy = (appData.privacy_policy || '').toLowerCase();

    for (const keyword of this.revenueRedFlags.undisclosed) {
      if (privacyPolicy.includes(keyword)) {
        hidden.push(keyword);
      }
    }

    return hidden;
  }

  /**
   * Detect deceptive revenue practices
   * @param {Object} appData - App data
   * @returns {Array} - Deceptive practices
   */
  detectDeceptivePractices(appData) {
    const practices = [];

    const description = (appData.description || '').toLowerCase();

    for (const keyword of this.revenueRedFlags.deceptive) {
      if (description.includes(keyword)) {
        practices.push(keyword);
      }
    }

    // Check for predatory practices
    for (const keyword of this.revenueRedFlags.predatory) {
      if (description.includes(keyword)) {
        practices.push(`Predatory: ${keyword}`);
      }
    }

    return practices;
  }

  /**
   * Verify revenue model consistency
   * @param {string|null} declared - Declared model
   * @param {Array} hidden - Hidden methods
   * @returns {boolean} - Is consistent
   */
  verifyRevenueModelConsistency(declared, hidden) {
    if (!declared) return false;
    if (hidden.length > 0) return false; // Hidden methods = not transparent
    return true;
  }

  /**
   * Detect financial red flags
   * @param {Object} fundingData - Funding data
   * @param {Object} investorAnalysis - Investor analysis
   * @param {Object} ownershipAnalysis - Ownership analysis
   * @param {Object} revenueAnalysis - Revenue analysis
   * @returns {Array} - Red flags
   */
  detectFinancialRedFlags(fundingData, investorAnalysis, ownershipAnalysis, revenueAnalysis) {
    const redFlags = [];

    // Critical: High-risk foreign ownership
    if (investorAnalysis.risk_assessment.foreign_ownership) {
      redFlags.push({
        severity: 'critical',
        category: 'foreign_ownership',
        description: 'Ownership from high-risk countries detected',
        score_impact: -35
      });
    }

    // Critical: Ethical concerns with investors
    if (investorAnalysis.risk_assessment.ethical_concerns.length > 0) {
      redFlags.push({
        severity: 'critical',
        category: 'investor_ethics',
        description: `Investors with ethical concerns: ${investorAnalysis.risk_assessment.ethical_concerns.join(', ')}`,
        score_impact: -30
      });
    }

    // Major: Hidden monetization
    if (revenueAnalysis.hidden_monetization.length > 0) {
      redFlags.push({
        severity: 'major',
        category: 'hidden_revenue',
        description: `Undisclosed monetization methods: ${revenueAnalysis.hidden_monetization.join(', ')}`,
        score_impact: -25
      });
    }

    // Major: Low ownership transparency
    if (ownershipAnalysis.transparency_level === 'low') {
      redFlags.push({
        severity: 'major',
        category: 'ownership_opacity',
        description: 'Low transparency in ownership structure',
        score_impact: -20
      });
    }

    // Major: Deceptive practices
    if (revenueAnalysis.deceptive_practices.length > 0) {
      redFlags.push({
        severity: 'major',
        category: 'deceptive_revenue',
        description: `Deceptive practices detected: ${revenueAnalysis.deceptive_practices.join(', ')}`,
        score_impact: -20
      });
    }

    // Minor: Shell company risk
    if (ownershipAnalysis.shell_company_risk) {
      redFlags.push({
        severity: 'minor',
        category: 'shell_company',
        description: 'Possible shell company structure',
        score_impact: -15
      });
    }

    // Minor: No revenue model disclosed
    if (!revenueAnalysis.declared) {
      redFlags.push({
        severity: 'minor',
        category: 'revenue_undisclosed',
        description: 'Revenue model not clearly disclosed',
        score_impact: -10
      });
    }

    return redFlags;
  }

  /**
   * Calculate overall financial transparency score
   * @param {Object} fundingData - Funding data
   * @param {Object} investorAnalysis - Investor analysis
   * @param {Object} ownershipAnalysis - Ownership analysis
   * @param {Object} revenueAnalysis - Revenue analysis
   * @param {Array} redFlags - Red flags
   * @returns {number} - Transparency score (0-100)
   */
  calculateTransparencyScore(fundingData, investorAnalysis, ownershipAnalysis, revenueAnalysis, redFlags) {
    let score = 50; // Base score

    // Funding transparency
    if (fundingData.total_raised) score += 10;
    if (fundingData.rounds.length > 0) score += 10;

    // Investor transparency
    if (investorAnalysis.risk_assessment.overall_risk === 'low') score += 20;
    else if (investorAnalysis.risk_assessment.overall_risk === 'medium') score += 10;
    else if (investorAnalysis.risk_assessment.overall_risk === 'high') score -= 20;

    // Ownership transparency
    if (ownershipAnalysis.transparency_level === 'high') score += 20;
    else if (ownershipAnalysis.transparency_level === 'medium') score += 10;
    else score -= 10;

    // Revenue transparency
    score += (revenueAnalysis.transparency_score - 50) / 2; // Weighted contribution

    // Apply red flag penalties
    for (const flag of redFlags) {
      score += flag.score_impact; // score_impact is negative
    }

    return Math.round(Math.max(0, Math.min(100, score)));
  }

  /**
   * Save financial records to database
   * @param {Object} pool - Database pool
   * @param {string} appId - App ID
   * @param {Object} data - Financial data
   * @returns {Promise<void>}
   */
  async saveFinancialRecords(pool, appId, data) {
    try {
      await pool.query(
        `INSERT INTO financial_records
         (app_id, funding_total, funding_rounds, investors, ownership,
          revenue_model, declared_revenue_model, verified_revenue_match,
          transparency_score, red_flags, last_updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)
         ON CONFLICT (app_id)
         DO UPDATE SET
           funding_total = $2,
           funding_rounds = $3,
           investors = $4,
           ownership = $5,
           revenue_model = $6,
           declared_revenue_model = $7,
           verified_revenue_match = $8,
           transparency_score = $9,
           red_flags = $10,
           last_updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [
          appId,
          data.funding.total_raised,
          JSON.stringify(data.funding.rounds),
          JSON.stringify(data.investors.investor_details),
          JSON.stringify(data.ownership),
          data.revenue.declared,
          data.revenue.declared,
          data.revenue.verified,
          data.transparency_score,
          JSON.stringify(data.red_flags)
        ]
      );

      this.log('info', 'Financial records saved successfully');
    } catch (error) {
      this.log('warn', `Could not save financial records: ${error.message}`);
    }
  }
}

module.exports = FinancialTrackerAgent;
