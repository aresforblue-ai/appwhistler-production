// backend/agents/sourceCredibilityAgent.js
// AI agent for assessing source credibility and reliability

class SourceCredibilityAgent {
  constructor() {
    this.name = 'SourceCredibilityAgent';
    this.version = '1.0.0';
    this.initialized = false;
    this.totalProcessed = 0;
    this.lastUsed = null;

    // Known credible domains (expandable)
    this.credibleDomains = new Set([
      'reuters.com',
      'apnews.com',
      'bbc.com',
      'npr.org',
      'nature.com',
      'science.org',
      'nejm.org',
      'thelancet.com',
      'who.int',
      'cdc.gov',
      'nih.gov',
      'gov.uk',
      'europa.eu',
    ]);

    // Known unreliable domains
    this.unreliableDomains = new Set([
      'fakenews.com',
      'clickbait.com',
      // Add known unreliable sources
    ]);

    // Credibility factors
    this.factors = {
      domain_reputation: 0.30,
      author_expertise: 0.25,
      publication_date: 0.15,
      citations: 0.15,
      transparency: 0.10,
      track_record: 0.05,
    };
  }

  async initialize() {
    console.log(`🤖 Initializing ${this.name}...`);
    // Load domain reputation databases, citation indexes, etc.
    this.initialized = true;
    return { status: 'ready', agent: this.name };
  }

  /**
   * Assess source credibility
   * @param {Object} source - Source information (URL, author, date, etc.)
   * @param {Object} options - Assessment options
   * @returns {Object} Credibility assessment result
   */
  async process(source, options = {}) {
    if (!source || (!source.url && !source.domain)) {
      throw new Error('Invalid source data');
    }

    const domain = source.domain || this.extractDomain(source.url);

    // Perform credibility checks
    const domainCheck = this.checkDomainReputation(domain);
    const authorCheck = this.checkAuthorExpertise(source.author);
    const dateCheck = this.checkPublicationDate(source.publishedAt);
    const citationCheck = this.checkCitations(source.citations);
    const transparencyCheck = this.checkTransparency(source);
    const trackRecordCheck = await this.checkTrackRecord(domain);

    // Calculate overall credibility score
    const credibilityScore = this.calculateCredibilityScore({
      domainCheck,
      authorCheck,
      dateCheck,
      citationCheck,
      transparencyCheck,
      trackRecordCheck,
    });

    const credibilityLevel = this.getCredibilityLevel(credibilityScore);

    this.totalProcessed++;
    this.lastUsed = new Date().toISOString();

    return {
      credibilityScore,
      credibilityLevel,
      domain,
      checks: {
        domain: domainCheck,
        author: authorCheck,
        date: dateCheck,
        citations: citationCheck,
        transparency: transparencyCheck,
        trackRecord: trackRecordCheck,
      },
      warnings: this.generateWarnings(domainCheck, authorCheck, dateCheck),
      recommendations: this.getRecommendations(credibilityLevel),
      assessedAt: new Date().toISOString(),
    };
  }

  /**
   * Extract domain from URL
   */
  extractDomain(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace('www.', '');
    } catch {
      return url;
    }
  }

  /**
   * Check domain reputation
   */
  checkDomainReputation(domain) {
    let score = 0.5; // Neutral baseline
    const flags = [];

    if (this.credibleDomains.has(domain)) {
      score = 0.95;
      flags.push('known_credible_source');
    } else if (this.unreliableDomains.has(domain)) {
      score = 0.1;
      flags.push('known_unreliable_source');
    } else {
      // Check domain characteristics
      if (domain.endsWith('.gov') || domain.endsWith('.edu')) {
        score = 0.85;
        flags.push('government_or_education');
      } else if (domain.endsWith('.org')) {
        score = 0.65;
        flags.push('organization');
      }

      // Check for suspicious patterns
      if (/\d{4,}/.test(domain)) {
        // Random numbers in domain
        score -= 0.2;
        flags.push('suspicious_domain_pattern');
      }
    }

    return {
      score,
      domain,
      flags,
      reputation: this.categorizeReputation(score),
    };
  }

  /**
   * Check author expertise
   */
  checkAuthorExpertise(author) {
    if (!author) {
      return {
        score: 0.4,
        hasAuthor: false,
        verified: false,
        expertise: 'unknown',
      };
    }

    // In production, check author credentials, publications, etc.
    // For now, basic heuristics

    let score = 0.6; // Has an author
    const verified = false; // Would check against expert databases

    // Check for credentials in author name
    if (/(PhD|MD|Dr\.|Professor)/i.test(author)) {
      score += 0.2;
    }

    return {
      score,
      hasAuthor: true,
      verified,
      expertise: score >= 0.7 ? 'expert' : 'general',
    };
  }

  /**
   * Check publication date
   */
  checkPublicationDate(publishedAt) {
    if (!publishedAt) {
      return {
        score: 0.5,
        hasDate: false,
        age: null,
        current: false,
      };
    }

    const date = new Date(publishedAt);
    const now = new Date();
    const ageInDays = (now - date) / (1000 * 60 * 60 * 24);

    let score = 1.0;

    // Older content gets lower score for time-sensitive topics
    if (ageInDays > 365) {
      score = 0.6;
    } else if (ageInDays > 180) {
      score = 0.7;
    } else if (ageInDays > 90) {
      score = 0.8;
    } else if (ageInDays > 30) {
      score = 0.9;
    }

    return {
      score,
      hasDate: true,
      age: Math.floor(ageInDays),
      current: ageInDays <= 30,
    };
  }

  /**
   * Check citations and references
   */
  checkCitations(citations) {
    if (!citations || citations.length === 0) {
      return {
        score: 0.3,
        hasCitations: false,
        count: 0,
        quality: 'none',
      };
    }

    let score = 0.5; // Base score for having citations

    // Quality assessment based on citation count and sources
    const count = citations.length;

    if (count >= 10) score = 0.9;
    else if (count >= 5) score = 0.8;
    else if (count >= 3) score = 0.7;
    else score = 0.6;

    // Check citation quality (if sources are provided)
    const credibleCitations = citations.filter(c =>
      this.credibleDomains.has(this.extractDomain(c.url || ''))
    );

    if (credibleCitations.length / count > 0.5) {
      score += 0.1;
    }

    return {
      score: Math.min(score, 1),
      hasCitations: true,
      count,
      credibleCount: credibleCitations.length,
      quality: score >= 0.8 ? 'high' : score >= 0.6 ? 'medium' : 'low',
    };
  }

  /**
   * Check transparency (author info, methodology, conflicts of interest)
   */
  checkTransparency(source) {
    let score = 0.5;
    const flags = [];

    if (source.author) {
      score += 0.2;
      flags.push('has_author');
    }

    if (source.methodology) {
      score += 0.2;
      flags.push('has_methodology');
    }

    if (source.conflictOfInterest !== undefined) {
      score += 0.1;
      flags.push('discloses_conflicts');
    }

    return {
      score: Math.min(score, 1),
      flags,
      transparent: score >= 0.7,
    };
  }

  /**
   * Check track record of the source
   */
  async checkTrackRecord(domain) {
    // In production, check historical accuracy, corrections, retractions
    // For now, use domain reputation as proxy

    const hasTrackRecord = this.credibleDomains.has(domain);

    return {
      score: hasTrackRecord ? 0.9 : 0.5,
      hasTrackRecord,
      corrections: 0, // Would track from database
      retractions: 0,
      accuracy: hasTrackRecord ? 'high' : 'unknown',
    };
  }

  /**
   * Calculate overall credibility score
   */
  calculateCredibilityScore(checks) {
    return (
      checks.domainCheck.score * this.factors.domain_reputation +
      checks.authorCheck.score * this.factors.author_expertise +
      checks.dateCheck.score * this.factors.publication_date +
      checks.citationCheck.score * this.factors.citations +
      checks.transparencyCheck.score * this.factors.transparency +
      checks.trackRecordCheck.score * this.factors.track_record
    );
  }

  /**
   * Categorize reputation
   */
  categorizeReputation(score) {
    if (score >= 0.9) return 'excellent';
    if (score >= 0.7) return 'good';
    if (score >= 0.5) return 'mixed';
    if (score >= 0.3) return 'poor';
    return 'very_poor';
  }

  /**
   * Get credibility level
   */
  getCredibilityLevel(score) {
    if (score >= 0.85) return 'very_high';
    if (score >= 0.70) return 'high';
    if (score >= 0.55) return 'medium';
    if (score >= 0.40) return 'low';
    return 'very_low';
  }

  /**
   * Generate warnings
   */
  generateWarnings(domainCheck, authorCheck, dateCheck) {
    const warnings = [];

    if (domainCheck.flags.includes('known_unreliable_source')) {
      warnings.push('Source is known to publish unreliable information');
    }

    if (domainCheck.flags.includes('suspicious_domain_pattern')) {
      warnings.push('Domain name has suspicious characteristics');
    }

    if (!authorCheck.hasAuthor) {
      warnings.push('No author information provided');
    }

    if (dateCheck.age && dateCheck.age > 365) {
      warnings.push('Content is more than a year old');
    }

    return warnings;
  }

  /**
   * Get recommendations
   */
  getRecommendations(credibilityLevel) {
    const recommendations = [];

    if (credibilityLevel === 'very_high' || credibilityLevel === 'high') {
      recommendations.push('Source appears credible, but verify claims independently');
    } else if (credibilityLevel === 'medium') {
      recommendations.push('Cross-check information with other sources');
      recommendations.push('Look for citations and supporting evidence');
    } else {
      recommendations.push('Exercise caution with this source');
      recommendations.push('Seek information from more credible sources');
      recommendations.push('Verify all claims independently');
    }

    return recommendations;
  }

  async shutdown() {
    console.log(`🛑 Shutting down ${this.name}...`);
    this.initialized = false;
  }
}

module.exports = new SourceCredibilityAgent();
