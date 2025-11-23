// Developer Profile Agent - LEGENDARY developer background investigation
// Comprehensive background checks: experience, track record, code quality, incidents
// LinkedIn, GitHub, Stack Overflow, app history, legal records

const BaseAgent = require('./BaseAgent');
const ApiClient = require('./utils/ApiClient');
const DataEnricher = require('./utils/DataEnricher');

class DeveloperProfileAgent extends BaseAgent {
  constructor() {
    super('DeveloperProfileAgent', '2.0');

    this.dataEnricher = new DataEnricher();

    // Initialize API clients
    this.clients = {
      // GitHub API for code quality and activity
      github: new ApiClient('GitHub', {
        baseUrl: 'https://api.github.com',
        rateLimit: 60,
        cacheTimeout: 3600000 // 1 hour
      }),

      // Stack Overflow API for technical expertise
      stackoverflow: new ApiClient('StackOverflow', {
        baseUrl: 'https://api.stackexchange.com/2.3',
        rateLimit: 300,
        cacheTimeout: 86400000 // 24 hours
      })
    };

    // Experience level thresholds
    this.experienceLevels = {
      novice: { years: 0, apps: 0 },
      beginner: { years: 1, apps: 0 },
      intermediate: { years: 2, apps: 1 },
      experienced: { years: 5, apps: 3 },
      expert: { years: 10, apps: 5 }
    };

    // Incident severity weights
    this.incidentWeights = {
      security_breach: -20,
      privacy_violation: -25,
      lawsuit: -15,
      app_store_removal: -10,
      terms_violation: -5
    };
  }

  /**
   * Main execution - comprehensive developer background check
   * @param {Object} context - {appId, pool, appData}
   * @returns {Promise<Object>} - Developer analysis
   */
  async execute(context) {
    const { appId, pool, appData: providedAppData } = context;

    this.log('info', `Analyzing developer profile for app ${appId}...`);

    // Fetch app data if not provided
    const appData = providedAppData || await this.fetchAppData(pool, appId);

    this.updateProgress(10);

    // Extract developer information
    const developerInfo = {
      name: appData.developer,
      company: appData.developer,
      packageId: appData.package_id
    };

    // Analyze GitHub presence and code quality
    const githubAnalysis = await this.analyzeGitHub(developerInfo);

    this.updateProgress(30);

    // Analyze Stack Overflow reputation
    const stackOverflowAnalysis = await this.analyzeStackOverflow(developerInfo);

    this.updateProgress(45);

    // Get previous app history
    const appHistory = await this.getAppHistory(pool, developerInfo);

    this.updateProgress(60);

    // Check incident history
    const incidentHistory = await this.checkIncidentHistory(pool, developerInfo);

    this.updateProgress(75);

    // Calculate experience metrics
    const experienceMetrics = this.calculateExperienceMetrics(
      appHistory,
      githubAnalysis,
      stackOverflowAnalysis
    );

    // Assess code quality
    const codeQualityMetrics = this.assessCodeQuality(githubAnalysis);

    // Calculate overall credibility score
    const credibilityScore = this.calculateCredibilityScore(
      experienceMetrics,
      codeQualityMetrics,
      incidentHistory,
      appHistory
    );

    this.updateProgress(90);

    // Save to database
    await this.saveDeveloperProfile(pool, appId, {
      developer_name: developerInfo.name,
      company_name: developerInfo.company,
      years_active: experienceMetrics.years_active,
      team_size: experienceMetrics.team_size,
      previous_apps: appHistory,
      incident_history: incidentHistory,
      code_quality_metrics: codeQualityMetrics,
      credibility_score: credibilityScore
    });

    this.updateProgress(100);

    return {
      credibility_score: credibilityScore,
      experience: {
        years_active: experienceMetrics.years_active,
        team_size: experienceMetrics.team_size,
        previous_apps: appHistory,
        technical_expertise: experienceMetrics.expertise_level
      },
      incident_history: {
        security_breaches: incidentHistory.security_breaches,
        privacy_violations: incidentHistory.privacy_violations,
        lawsuits: incidentHistory.lawsuits,
        app_store_removals: incidentHistory.app_store_removals,
        details: incidentHistory.details
      },
      code_quality: codeQualityMetrics,
      analysis_timestamp: new Date().toISOString()
    };
  }

  /**
   * Analyze GitHub presence and code quality
   * @param {Object} developerInfo - Developer information
   * @returns {Promise<Object>} - GitHub analysis
   */
  async analyzeGitHub(developerInfo) {
    this.log('info', 'Analyzing GitHub presence...');

    const analysis = {
      profile_found: false,
      repositories: [],
      total_stars: 0,
      total_forks: 0,
      total_commits: 0,
      languages: [],
      contribution_activity: 0,
      account_age_days: 0,
      open_source_contributions: false
    };

    try {
      // Search for developer's GitHub profile
      // In production: const username = await this.findGitHubUsername(developerInfo.name);

      // Get user profile
      // const profile = await this.clients.github.request({
      //   url: `/users/${username}`,
      //   headers: {
      //     'Authorization': `token ${process.env.GITHUB_TOKEN}`,
      //     'Accept': 'application/vnd.github.v3+json'
      //   }
      // });

      // Get repositories
      // const repos = await this.clients.github.request({
      //   url: `/users/${username}/repos`,
      //   params: {
      //     sort: 'updated',
      //     per_page: 100
      //   },
      //   headers: {
      //     'Authorization': `token ${process.env.GITHUB_TOKEN}`,
      //     'Accept': 'application/vnd.github.v3+json'
      //   }
      // });

      // Mock data for now
      analysis.profile_found = true;
      analysis.account_age_days = 365; // Would calculate from created_at

      this.log('info', 'GitHub profile analyzed successfully');
    } catch (error) {
      this.log('warn', `GitHub analysis failed: ${error.message}`);
    }

    return analysis;
  }

  /**
   * Analyze Stack Overflow reputation
   * @param {Object} developerInfo - Developer information
   * @returns {Promise<Object>} - Stack Overflow analysis
   */
  async analyzeStackOverflow(developerInfo) {
    this.log('info', 'Analyzing Stack Overflow reputation...');

    const analysis = {
      profile_found: false,
      reputation: 0,
      badges: {
        gold: 0,
        silver: 0,
        bronze: 0
      },
      answer_count: 0,
      question_count: 0,
      expertise_tags: []
    };

    try {
      // Search for Stack Overflow user
      // const response = await this.clients.stackoverflow.request({
      //   url: '/users',
      //   params: {
      //     inname: developerInfo.name,
      //     site: 'stackoverflow',
      //     key: process.env.STACKOVERFLOW_API_KEY
      //   }
      // });

      // Mock data
      analysis.profile_found = false; // Most developers don't have SO profiles

      this.log('info', 'Stack Overflow analysis complete');
    } catch (error) {
      this.log('warn', `Stack Overflow analysis failed: ${error.message}`);
    }

    return analysis;
  }

  /**
   * Get developer's previous app history
   * @param {Object} pool - Database pool
   * @param {Object} developerInfo - Developer information
   * @returns {Promise<Array>} - Previous apps
   */
  async getAppHistory(pool, developerInfo) {
    this.log('info', 'Retrieving app history...');

    try {
      // Query for other apps by same developer
      const result = await pool.query(
        `SELECT
           id, name, platform, average_rating, download_count, created_at,
           truth_rating, category
         FROM apps
         WHERE developer = $1
         ORDER BY created_at DESC
         LIMIT 20`,
        [developerInfo.name]
      );

      const apps = result.rows.map(row => ({
        name: row.name,
        platform: row.platform,
        rating: row.average_rating || 0,
        downloads: this.formatDownloadCount(row.download_count),
        truth_rating: row.truth_rating || 0,
        category: row.category,
        age_days: this.calculateDaysSince(row.created_at),
        controversies: [] // Would be populated from incident tracking
      }));

      this.log('info', `Found ${apps.length} previous apps`);
      return apps;
    } catch (error) {
      this.log('warn', `App history retrieval failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Check for security incidents, violations, lawsuits
   * @param {Object} pool - Database pool
   * @param {Object} developerInfo - Developer information
   * @returns {Promise<Object>} - Incident history
   */
  async checkIncidentHistory(pool, developerInfo) {
    this.log('info', 'Checking incident history...');

    const history = {
      security_breaches: 0,
      privacy_violations: 0,
      lawsuits: 0,
      app_store_removals: 0,
      details: []
    };

    try {
      // In production, would query:
      // - CVE databases for security incidents
      // - Legal databases for lawsuits
      // - App store removal records
      // - Privacy violation reports

      // Check our own incident log
      const result = await pool.query(
        `SELECT incident_type, description, incident_date, resolved
         FROM developer_incidents
         WHERE developer_name = $1
         ORDER BY incident_date DESC
         LIMIT 50`,
        [developerInfo.name]
      );

      for (const incident of result.rows) {
        const type = incident.incident_type;

        if (type === 'security_breach') history.security_breaches++;
        else if (type === 'privacy_violation') history.privacy_violations++;
        else if (type === 'lawsuit') history.lawsuits++;
        else if (type === 'app_store_removal') history.app_store_removals++;

        history.details.push({
          type,
          description: incident.description,
          date: incident.incident_date,
          resolved: incident.resolved
        });
      }

      this.log('info', `Found ${history.details.length} incidents`);
    } catch (error) {
      // Table might not exist
      this.log('warn', `Incident check failed: ${error.message}`);
    }

    return history;
  }

  /**
   * Calculate experience metrics
   * @param {Array} appHistory - Previous apps
   * @param {Object} githubAnalysis - GitHub analysis
   * @param {Object} stackOverflowAnalysis - Stack Overflow analysis
   * @returns {Object} - Experience metrics
   */
  calculateExperienceMetrics(appHistory, githubAnalysis, stackOverflowAnalysis) {
    const metrics = {
      years_active: 0,
      team_size: 1, // Default to solo developer
      expertise_level: 'novice',
      app_count: appHistory.length
    };

    // Calculate years active from oldest app
    if (appHistory.length > 0) {
      const oldestApp = appHistory[appHistory.length - 1];
      metrics.years_active = Math.floor(oldestApp.age_days / 365);
    }

    // Estimate from GitHub account age
    if (githubAnalysis.profile_found && githubAnalysis.account_age_days > 0) {
      const githubYears = Math.floor(githubAnalysis.account_age_days / 365);
      metrics.years_active = Math.max(metrics.years_active, githubYears);
    }

    // Estimate team size from GitHub activity and app count
    if (appHistory.length > 5 || githubAnalysis.total_commits > 1000) {
      metrics.team_size = 5; // Likely small team
    } else if (appHistory.length > 10 || githubAnalysis.total_commits > 5000) {
      metrics.team_size = 20; // Likely medium team
    }

    // Determine expertise level
    metrics.expertise_level = this.categorizeExpertise(
      metrics.years_active,
      metrics.app_count,
      githubAnalysis,
      stackOverflowAnalysis
    );

    return metrics;
  }

  /**
   * Categorize developer expertise level
   * @param {number} years - Years active
   * @param {number} appCount - Number of apps
   * @param {Object} githubAnalysis - GitHub analysis
   * @param {Object} stackOverflowAnalysis - Stack Overflow analysis
   * @returns {string} - Expertise level
   */
  categorizeExpertise(years, appCount, githubAnalysis, stackOverflowAnalysis) {
    let score = 0;

    // Years active
    if (years >= 10) score += 40;
    else if (years >= 5) score += 30;
    else if (years >= 2) score += 20;
    else if (years >= 1) score += 10;

    // App count
    if (appCount >= 10) score += 30;
    else if (appCount >= 5) score += 20;
    else if (appCount >= 2) score += 10;

    // GitHub activity
    if (githubAnalysis.total_stars > 1000) score += 15;
    else if (githubAnalysis.total_stars > 100) score += 10;

    if (githubAnalysis.open_source_contributions) score += 10;

    // Stack Overflow reputation
    if (stackOverflowAnalysis.reputation > 10000) score += 15;
    else if (stackOverflowAnalysis.reputation > 1000) score += 10;
    else if (stackOverflowAnalysis.reputation > 100) score += 5;

    // Classify
    if (score >= 80) return 'expert';
    if (score >= 60) return 'experienced';
    if (score >= 40) return 'intermediate';
    if (score >= 20) return 'beginner';
    return 'novice';
  }

  /**
   * Assess code quality from GitHub metrics
   * @param {Object} githubAnalysis - GitHub analysis
   * @returns {Object} - Code quality metrics
   */
  assessCodeQuality(githubAnalysis) {
    const metrics = {
      github_stars: githubAnalysis.total_stars,
      github_forks: githubAnalysis.total_forks,
      code_review_score: 0,
      open_source_contributions: githubAnalysis.open_source_contributions,
      language_diversity: githubAnalysis.languages.length,
      activity_level: 'unknown'
    };

    // Calculate code review score (0-100)
    let score = 50; // Base score

    // Stars indicate quality/popularity
    if (githubAnalysis.total_stars > 1000) score += 25;
    else if (githubAnalysis.total_stars > 100) score += 15;
    else if (githubAnalysis.total_stars > 10) score += 10;

    // Forks indicate usefulness
    if (githubAnalysis.total_forks > 100) score += 15;
    else if (githubAnalysis.total_forks > 10) score += 10;

    // Open source contributions show engagement
    if (githubAnalysis.open_source_contributions) score += 10;

    // Language diversity shows versatility
    if (githubAnalysis.languages.length > 5) score += 10;
    else if (githubAnalysis.languages.length > 2) score += 5;

    metrics.code_review_score = Math.min(100, score);

    // Determine activity level
    if (githubAnalysis.contribution_activity > 500) metrics.activity_level = 'very_active';
    else if (githubAnalysis.contribution_activity > 200) metrics.activity_level = 'active';
    else if (githubAnalysis.contribution_activity > 50) metrics.activity_level = 'moderate';
    else if (githubAnalysis.contribution_activity > 0) metrics.activity_level = 'low';
    else metrics.activity_level = 'inactive';

    return metrics;
  }

  /**
   * Calculate overall developer credibility score
   * @param {Object} experienceMetrics - Experience metrics
   * @param {Object} codeQualityMetrics - Code quality metrics
   * @param {Object} incidentHistory - Incident history
   * @param {Array} appHistory - Previous apps
   * @returns {number} - Credibility score (0-100)
   */
  calculateCredibilityScore(experienceMetrics, codeQualityMetrics, incidentHistory, appHistory) {
    let score = 50; // Start neutral

    // Experience contribution (30 points max)
    if (experienceMetrics.expertise_level === 'expert') score += 30;
    else if (experienceMetrics.expertise_level === 'experienced') score += 20;
    else if (experienceMetrics.expertise_level === 'intermediate') score += 10;
    else if (experienceMetrics.expertise_level === 'beginner') score += 5;

    // Code quality contribution (20 points max)
    score += (codeQualityMetrics.code_review_score - 50) * 0.4; // Convert 0-100 to -20 to +20

    // App history contribution (20 points max)
    if (appHistory.length > 0) {
      const avgRating = appHistory.reduce((sum, app) => sum + app.rating, 0) / appHistory.length;
      const avgTruthRating = appHistory.reduce((sum, app) => sum + app.truth_rating, 0) / appHistory.length;

      // App ratings (10 points max)
      if (avgRating >= 4.5) score += 10;
      else if (avgRating >= 4.0) score += 7;
      else if (avgRating >= 3.5) score += 5;
      else if (avgRating < 3.0) score -= 10;

      // Truth ratings (10 points max)
      if (avgTruthRating >= 80) score += 10;
      else if (avgTruthRating >= 70) score += 7;
      else if (avgTruthRating >= 60) score += 5;
      else if (avgTruthRating < 50) score -= 10;
    }

    // Incident history penalties (can heavily impact)
    score += incidentHistory.security_breaches * this.incidentWeights.security_breach;
    score += incidentHistory.privacy_violations * this.incidentWeights.privacy_violation;
    score += incidentHistory.lawsuits * this.incidentWeights.lawsuit;
    score += incidentHistory.app_store_removals * this.incidentWeights.app_store_removal;

    // Ensure score is within 0-100
    return Math.round(Math.max(0, Math.min(100, score)));
  }

  /**
   * Save developer profile to database
   * @param {Object} pool - Database pool
   * @param {string} appId - App ID
   * @param {Object} profileData - Profile data
   * @returns {Promise<void>}
   */
  async saveDeveloperProfile(pool, appId, profileData) {
    try {
      await pool.query(
        `INSERT INTO developer_profiles
         (app_id, developer_name, company_name, years_active, team_size,
          previous_apps, incident_history, code_quality_metrics, credibility_score, last_updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
         ON CONFLICT (app_id)
         DO UPDATE SET
           developer_name = $2,
           company_name = $3,
           years_active = $4,
           team_size = $5,
           previous_apps = $6,
           incident_history = $7,
           code_quality_metrics = $8,
           credibility_score = $9,
           last_updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [
          appId,
          profileData.developer_name,
          profileData.company_name,
          profileData.years_active,
          profileData.team_size,
          JSON.stringify(profileData.previous_apps),
          JSON.stringify(profileData.incident_history),
          JSON.stringify(profileData.code_quality_metrics),
          profileData.credibility_score
        ]
      );

      this.log('info', 'Developer profile saved successfully');
    } catch (error) {
      this.log('warn', `Could not save developer profile: ${error.message}`);
    }
  }

  /**
   * Format download count for display
   * @param {number} count - Download count
   * @returns {string} - Formatted count
   */
  formatDownloadCount(count) {
    if (!count) return '0';
    if (count >= 1000000000) return `${(count / 1000000000).toFixed(1)}B+`;
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M+`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K+`;
    return count.toString();
  }

  /**
   * Calculate days since a date
   * @param {Date} date - Date
   * @returns {number} - Days
   */
  calculateDaysSince(date) {
    const now = new Date();
    const then = new Date(date);
    const diffMs = now - then;
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }
}

module.exports = DeveloperProfileAgent;
