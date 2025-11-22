// backend/agents/privacyAnalysisAgent.js
// AI agent for privacy policy analysis and data collection practices assessment

class PrivacyAnalysisAgent {
  constructor() {
    this.name = 'PrivacyAnalysisAgent';
    this.version = '1.0.0';
    this.initialized = false;
    this.totalProcessed = 0;
    this.lastUsed = null;

    // Privacy concern categories
    this.privacyConcerns = {
      data_collection: ['personal data', 'location', 'contacts', 'camera', 'microphone'],
      data_sharing: ['third party', 'advertising', 'analytics', 'partners'],
      data_retention: ['indefinitely', 'permanently', 'no deletion'],
      user_rights: ['gdpr', 'ccpa', 'data portability', 'right to delete'],
      encryption: ['encrypted', 'ssl', 'tls', 'secure'],
    };
  }

  async initialize() {
    console.log(`🤖 Initializing ${this.name}...`);
    this.initialized = true;
    return { status: 'ready', agent: this.name };
  }

  /**
   * Analyze privacy policy and practices
   * @param {Object} data - Privacy policy text and app metadata
   * @param {Object} options - Analysis options
   * @returns {Object} Privacy analysis result
   */
  async process(data, options = {}) {
    const { privacyPolicy, permissions = [], metadata = {} } = data;

    if (!privacyPolicy && permissions.length === 0) {
      throw new Error('No privacy data provided');
    }

    const policyScore = privacyPolicy ? this.analyzePolicyText(privacyPolicy) : null;
    const permissionScore = this.analyzePermissions(permissions);
    const concerns = this.identifyConcerns(privacyPolicy, permissions);

    // Calculate overall privacy score (0-100, higher is better)
    const overallScore = this.calculateOverallScore(policyScore, permissionScore, concerns);

    this.totalProcessed++;
    this.lastUsed = new Date().toISOString();

    return {
      privacyScore: Math.round(overallScore),
      grade: this.getPrivacyGrade(overallScore),
      policyAnalysis: policyScore,
      permissionAnalysis: permissionScore,
      concerns,
      recommendations: this.getRecommendations(concerns),
      compliantWith: this.checkCompliance(privacyPolicy),
      analyzedAt: new Date().toISOString(),
    };
  }

  /**
   * Analyze privacy policy text
   */
  analyzePolicyText(policyText) {
    const lower = policyText.toLowerCase();
    const analysis = {
      hasPolicy: true,
      length: policyText.length,
      readabilityScore: this.calculateReadability(policyText),
      dataCollection: [],
      dataSharing: [],
      userRights: [],
      encryption: false,
    };

    // Check data collection mentions
    this.privacyConcerns.data_collection.forEach(term => {
      if (lower.includes(term)) {
        analysis.dataCollection.push(term);
      }
    });

    // Check data sharing
    this.privacyConcerns.data_sharing.forEach(term => {
      if (lower.includes(term)) {
        analysis.dataSharing.push(term);
      }
    });

    // Check user rights
    this.privacyConcerns.user_rights.forEach(term => {
      if (lower.includes(term)) {
        analysis.userRights.push(term);
      }
    });

    // Check encryption
    analysis.encryption = this.privacyConcerns.encryption.some(term => lower.includes(term));

    return analysis;
  }

  /**
   * Analyze app permissions
   */
  analyzePermissions(permissions) {
    const riskLevels = {
      high: ['camera', 'microphone', 'location', 'contacts', 'sms', 'phone'],
      medium: ['storage', 'calendar', 'photos'],
      low: ['internet', 'vibrate', 'notifications'],
    };

    const categorized = {
      high: [],
      medium: [],
      low: [],
    };

    permissions.forEach(perm => {
      const permLower = perm.toLowerCase();
      let categorized_flag = false;

      for (const [level, keywords] of Object.entries(riskLevels)) {
        if (keywords.some(kw => permLower.includes(kw))) {
          categorized[level].push(perm);
          categorized_flag = true;
          break;
        }
      }

      if (!categorized_flag) {
        categorized.low.push(perm);
      }
    });

    return {
      total: permissions.length,
      byRisk: categorized,
      riskScore: this.calculatePermissionRisk(categorized),
    };
  }

  /**
   * Identify privacy concerns
   */
  identifyConcerns(policyText, permissions) {
    const concerns = [];

    // Check for vague language
    if (policyText && /(may|might|possibly|potentially)/i.test(policyText)) {
      concerns.push({
        type: 'vague_language',
        severity: 'medium',
        description: 'Privacy policy contains vague or ambiguous language',
      });
    }

    // Check for third-party sharing
    if (policyText && /third[- ]party/i.test(policyText)) {
      concerns.push({
        type: 'third_party_sharing',
        severity: 'high',
        description: 'Data may be shared with third parties',
      });
    }

    // Check for excessive permissions
    const highRiskPerms = permissions.filter(p =>
      ['camera', 'microphone', 'location', 'contacts'].some(kw =>
        p.toLowerCase().includes(kw)
      )
    );

    if (highRiskPerms.length >= 3) {
      concerns.push({
        type: 'excessive_permissions',
        severity: 'high',
        description: 'App requests many sensitive permissions',
      });
    }

    return concerns;
  }

  /**
   * Calculate overall privacy score
   */
  calculateOverallScore(policyScore, permissionScore, concerns) {
    let score = 100;

    // Deduct points for concerns
    concerns.forEach(concern => {
      const deduction = concern.severity === 'high' ? 15 : concern.severity === 'medium' ? 10 : 5;
      score -= deduction;
    });

    // Deduct points for risky permissions
    if (permissionScore) {
      score -= permissionScore.riskScore;
    }

    // Add points for good practices
    if (policyScore) {
      if (policyScore.encryption) score += 10;
      if (policyScore.userRights.length > 0) score += 5;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate permission risk score
   */
  calculatePermissionRisk(categorized) {
    return categorized.high.length * 10 + categorized.medium.length * 5 + categorized.low.length * 1;
  }

  /**
   * Calculate readability score (simplified Flesch reading ease)
   */
  calculateReadability(text) {
    const sentences = text.split(/[.!?]+/).length;
    const words = text.split(/\s+/).length;
    const syllables = words * 1.5; // Rough estimate

    if (sentences === 0 || words === 0) return 0;

    const score = 206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words);
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Get privacy grade
   */
  getPrivacyGrade(score) {
    if (score >= 90) return 'A+';
    if (score >= 80) return 'A';
    if (score >= 70) return 'B';
    if (score >= 60) return 'C';
    if (score >= 50) return 'D';
    return 'F';
  }

  /**
   * Get recommendations
   */
  getRecommendations(concerns) {
    const recs = ['Review privacy policy carefully before using app'];

    if (concerns.some(c => c.type === 'third_party_sharing')) {
      recs.push('Be aware that your data may be shared with third parties');
    }

    if (concerns.some(c => c.type === 'excessive_permissions')) {
      recs.push('Consider denying unnecessary permissions');
    }

    return recs;
  }

  /**
   * Check regulatory compliance
   */
  checkCompliance(policyText) {
    if (!policyText) return [];

    const compliance = [];
    const lower = policyText.toLowerCase();

    if (lower.includes('gdpr')) compliance.push('GDPR');
    if (lower.includes('ccpa')) compliance.push('CCPA');
    if (lower.includes('coppa')) compliance.push('COPPA');

    return compliance;
  }

  async shutdown() {
    console.log(`🛑 Shutting down ${this.name}...`);
    this.initialized = false;
  }
}

module.exports = new PrivacyAnalysisAgent();
