// backend/agents/securityScanningAgent.js
// AI agent for security vulnerability scanning and threat detection

class SecurityScanningAgent {
  constructor() {
    this.name = 'SecurityScanningAgent';
    this.version = '1.0.0';
    this.initialized = false;
    this.totalProcessed = 0;
    this.lastUsed = null;

    // Security vulnerability patterns
    this.vulnerabilityPatterns = {
      sql_injection: /(\bselect\b.*\bfrom\b)|(\bunion\b.*\bselect\b)|('.*or.*=.*)/i,
      xss: /(<script|javascript:|onerror=|onload=)/i,
      path_traversal: /(\.\.\/|\.\.\\)/,
      command_injection: /(\||;|&&|\$\(|\`)/,
      sensitive_data: /(password|api[_-]?key|secret|token|credential)/i,
    };

    // Security categories
    this.severityLevels = {
      critical: { score: 10, color: 'red' },
      high: { score: 7, color: 'orange' },
      medium: { score: 5, color: 'yellow' },
      low: { score: 3, color: 'blue' },
      info: { score: 1, color: 'gray' },
    };
  }

  async initialize() {
    console.log(`🤖 Initializing ${this.name}...`);
    this.initialized = true;
    return { status: 'ready', agent: this.name };
  }

  /**
   * Scan for security vulnerabilities
   * @param {Object} target - The target to scan (code, URL, config, etc.)
   * @param {Object} options - Scan options
   * @returns {Object} Security scan result
   */
  async process(target, options = {}) {
    if (!target) {
      throw new Error('No scan target provided');
    }

    const scanType = options.scanType || 'comprehensive';
    const findings = [];
    let riskScore = 0;

    // Scan based on target type
    if (typeof target === 'string') {
      findings.push(...this.scanText(target));
    } else if (typeof target === 'object') {
      findings.push(...this.scanObject(target));
    }

    // Calculate risk score
    findings.forEach(finding => {
      riskScore += this.severityLevels[finding.severity]?.score || 0;
    });

    // Normalize to 0-100 scale
    const normalizedRisk = Math.min(riskScore * 5, 100);

    this.totalProcessed++;
    this.lastUsed = new Date().toISOString();

    return {
      safe: normalizedRisk < 30,
      riskScore: normalizedRisk,
      riskLevel: this.getRiskLevel(normalizedRisk),
      findings,
      summary: this.generateSummary(findings),
      recommendations: this.getRecommendations(findings),
      scannedAt: new Date().toISOString(),
    };
  }

  /**
   * Scan text for security issues
   */
  scanText(text) {
    const findings = [];

    for (const [vuln, pattern] of Object.entries(this.vulnerabilityPatterns)) {
      if (pattern.test(text)) {
        findings.push({
          type: vuln,
          severity: this.getVulnerabilitySeverity(vuln),
          description: this.getVulnerabilityDescription(vuln),
          location: 'text_content',
          remediation: this.getRemediation(vuln),
        });
      }
    }

    return findings;
  }

  /**
   * Scan object for security issues
   */
  scanObject(obj) {
    const findings = [];

    // Check for exposed sensitive keys
    const sensitiveKeys = ['password', 'apiKey', 'secret', 'token', 'privateKey'];

    for (const key of Object.keys(obj)) {
      if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk.toLowerCase()))) {
        findings.push({
          type: 'exposed_sensitive_data',
          severity: 'critical',
          description: `Potentially exposed sensitive key: ${key}`,
          location: `object.${key}`,
          remediation: 'Remove sensitive data from public objects',
        });
      }
    }

    return findings;
  }

  /**
   * Get vulnerability severity
   */
  getVulnerabilitySeverity(vulnType) {
    const severityMap = {
      sql_injection: 'critical',
      xss: 'high',
      command_injection: 'critical',
      path_traversal: 'high',
      sensitive_data: 'medium',
    };
    return severityMap[vulnType] || 'medium';
  }

  /**
   * Get vulnerability description
   */
  getVulnerabilityDescription(vulnType) {
    const descriptions = {
      sql_injection: 'Potential SQL injection vulnerability detected',
      xss: 'Cross-site scripting (XSS) vulnerability detected',
      command_injection: 'Command injection vulnerability detected',
      path_traversal: 'Path traversal vulnerability detected',
      sensitive_data: 'Sensitive data exposure detected',
    };
    return descriptions[vulnType] || 'Security vulnerability detected';
  }

  /**
   * Get remediation advice
   */
  getRemediation(vulnType) {
    const remediations = {
      sql_injection: 'Use parameterized queries or prepared statements',
      xss: 'Sanitize user input and encode output',
      command_injection: 'Avoid executing system commands with user input',
      path_traversal: 'Validate and sanitize file paths',
      sensitive_data: 'Remove or encrypt sensitive data',
    };
    return remediations[vulnType] || 'Follow security best practices';
  }

  /**
   * Get risk level category
   */
  getRiskLevel(score) {
    if (score >= 70) return 'critical';
    if (score >= 50) return 'high';
    if (score >= 30) return 'medium';
    if (score >= 10) return 'low';
    return 'minimal';
  }

  /**
   * Generate summary
   */
  generateSummary(findings) {
    const severityCounts = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
    };

    findings.forEach(f => {
      severityCounts[f.severity] = (severityCounts[f.severity] || 0) + 1;
    });

    return {
      total: findings.length,
      bySeverity: severityCounts,
    };
  }

  /**
   * Get security recommendations
   */
  getRecommendations(findings) {
    const recommendations = [
      'Implement input validation and sanitization',
      'Use secure coding practices',
      'Keep dependencies up to date',
      'Implement security headers',
      'Use HTTPS/TLS for all communications',
    ];

    if (findings.length > 0) {
      recommendations.unshift('Address all identified vulnerabilities immediately');
    }

    return recommendations.slice(0, 5);
  }

  async shutdown() {
    console.log(`🛑 Shutting down ${this.name}...`);
    this.initialized = false;
  }
}

module.exports = new SecurityScanningAgent();
