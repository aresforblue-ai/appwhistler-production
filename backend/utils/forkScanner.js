/**
 * GitHub Fork Scanner
 * 
 * Scans GitHub forks of AppWhistler to detect brand/trademark violations
 * Uses free GitHub API to monitor fork compliance with CLA requirements
 */

const https = require('https');

/**
 * Configuration
 */
const REPO_CONFIG = {
  owner: 'aresforblue-ai',
  repo: 'appwhistler-production',
  githubApi: 'api.github.com',
};

/**
 * Scan all forks of the repository for brand violations
 */
async function scanAllForks() {
  try {
    console.log('[Fork Scanner] Fetching forks...');
    const forks = await getForks();
    console.log(`[Fork Scanner] Found ${forks.length} forks`);

    const results = [];
    for (const fork of forks) {
      const analysis = await analyzeFork(fork);
      results.push(analysis);
      
      // Rate limiting - be nice to GitHub API
      await sleep(1000);
    }

    return generateForkReport(results);
  } catch (error) {
    console.error('[Fork Scanner] Error scanning forks:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Get list of forks from GitHub API
 */
function getForks(page = 1, perPage = 30) {
  return new Promise((resolve, reject) => {
    const path = `/repos/${REPO_CONFIG.owner}/${REPO_CONFIG.repo}/forks?page=${page}&per_page=${perPage}`;
    
    const options = {
      hostname: REPO_CONFIG.githubApi,
      path,
      method: 'GET',
      headers: {
        'User-Agent': 'AppWhistler-Brand-Monitor',
        'Accept': 'application/vnd.github.v3+json',
      },
    };

    // Add GitHub token if available
    const githubToken = process.env.GITHUB_TOKEN;
    if (githubToken) {
      options.headers['Authorization'] = `token ${githubToken}`;
    }

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const forks = JSON.parse(body);
          if (res.statusCode === 200) {
            resolve(forks);
          } else {
            reject(new Error(`GitHub API error: ${res.statusCode} - ${body}`));
          }
        } catch (e) {
          reject(new Error('Failed to parse GitHub API response'));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

/**
 * Get README content from a repository
 */
function getReadmeContent(owner, repo) {
  return new Promise((resolve, reject) => {
    const path = `/repos/${owner}/${repo}/readme`;
    
    const options = {
      hostname: REPO_CONFIG.githubApi,
      path,
      method: 'GET',
      headers: {
        'User-Agent': 'AppWhistler-Brand-Monitor',
        'Accept': 'application/vnd.github.v3.raw',
      },
    };

    const githubToken = process.env.GITHUB_TOKEN;
    if (githubToken) {
      options.headers['Authorization'] = `token ${githubToken}`;
    }

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(body);
        } else {
          resolve(null); // README might not exist
        }
      });
    });

    req.on('error', () => resolve(null));
    req.end();
  });
}

/**
 * Get package.json content from a repository
 */
function getPackageJson(owner, repo, path = 'package.json') {
  return new Promise((resolve, reject) => {
    const apiPath = `/repos/${owner}/${repo}/contents/${path}`;
    
    const options = {
      hostname: REPO_CONFIG.githubApi,
      path: apiPath,
      method: 'GET',
      headers: {
        'User-Agent': 'AppWhistler-Brand-Monitor',
        'Accept': 'application/vnd.github.v3.raw',
      },
    };

    const githubToken = process.env.GITHUB_TOKEN;
    if (githubToken) {
      options.headers['Authorization'] = `token ${githubToken}`;
    }

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            resolve(null);
          }
        } else {
          resolve(null);
        }
      });
    });

    req.on('error', () => resolve(null));
    req.end();
  });
}

/**
 * Analyze a single fork for brand violations
 */
async function analyzeFork(fork) {
  const violations = [];
  const warnings = [];
  let complianceScore = 100;

  // Basic fork info
  const forkInfo = {
    owner: fork.owner.login,
    name: fork.name,
    fullName: fork.full_name,
    url: fork.html_url,
    description: fork.description || '',
    homepage: fork.homepage || '',
    createdAt: fork.created_at,
    updatedAt: fork.updated_at,
    stars: fork.stargazers_count,
    hasPages: fork.has_pages,
  };

  // Check 1: Repository name
  if (fork.name.toLowerCase().includes('appwhistler') || 
      fork.name.toLowerCase().includes('app-whistler')) {
    violations.push({
      type: 'name_violation',
      severity: 'high',
      detail: `Repository name "${fork.name}" contains AppWhistler brand`,
      recommendation: 'Repository must be renamed to avoid trademark confusion',
    });
    complianceScore -= 30;
  }

  // Check 2: Description
  if (fork.description) {
    const desc = fork.description.toLowerCase();
    if (desc.includes('appwhistler') && !desc.includes('fork') && !desc.includes('based on')) {
      violations.push({
        type: 'description_violation',
        severity: 'medium',
        detail: 'Description mentions AppWhistler without attribution',
        recommendation: 'Add "Forked from AppWhistler" or similar attribution',
      });
      complianceScore -= 15;
    }
  }

  // Check 3: README content
  const readme = await getReadmeContent(fork.owner.login, fork.name);
  if (readme) {
    const readmeLower = readme.toLowerCase();
    
    // Check for AppWhistler mentions without attribution
    const appwhistlerMentions = (readme.match(/appwhistler/gi) || []).length;
    const attributionKeywords = ['fork', 'based on', 'derived from', 'original project'];
    const hasAttribution = attributionKeywords.some(keyword => readmeLower.includes(keyword));

    if (appwhistlerMentions > 5 && !hasAttribution) {
      violations.push({
        type: 'readme_no_attribution',
        severity: 'high',
        detail: `README contains ${appwhistlerMentions} AppWhistler mentions without attribution`,
        recommendation: 'Add clear attribution to original AppWhistler project',
      });
      complianceScore -= 25;
    }

    // Check for claims of being official
    const officialClaims = [
      'official appwhistler',
      'appwhistler team',
      'maintained by appwhistler',
      'appwhistler inc',
    ];
    if (officialClaims.some(claim => readmeLower.includes(claim))) {
      violations.push({
        type: 'false_official_claim',
        severity: 'critical',
        detail: 'README falsely claims official status or affiliation',
        recommendation: 'Remove false claims immediately - potential legal issue',
      });
      complianceScore -= 50;
    }

    // Check for rebranding compliance
    if (!hasAttribution && appwhistlerMentions > 0) {
      warnings.push({
        type: 'possible_rebrand_needed',
        detail: 'Fork may need rebranding per CLA requirements',
        recommendation: 'Review CLA.md for rebranding requirements',
      });
      complianceScore -= 10;
    }
  } else {
    warnings.push({
      type: 'no_readme',
      detail: 'Fork has no README - cannot verify compliance',
      recommendation: 'Check repository manually',
    });
  }

  // Check 4: package.json
  const packageJson = await getPackageJson(fork.owner.login, fork.name);
  if (packageJson) {
    if (packageJson.name && packageJson.name.includes('appwhistler')) {
      violations.push({
        type: 'package_name_violation',
        severity: 'high',
        detail: `Package name "${packageJson.name}" contains AppWhistler brand`,
        recommendation: 'Change package name in package.json',
      });
      complianceScore -= 20;
    }
  }

  // Check 5: Homepage/deployment
  if (fork.homepage && fork.homepage.includes('appwhistler')) {
    violations.push({
      type: 'domain_violation',
      severity: 'critical',
      detail: `Homepage URL "${fork.homepage}" uses AppWhistler brand`,
      recommendation: 'Change domain name or remove homepage link',
    });
    complianceScore -= 40;
  }

  // Check 6: GitHub Pages
  if (fork.has_pages) {
    warnings.push({
      type: 'has_deployment',
      detail: 'Fork has GitHub Pages enabled - deployed version may use AppWhistler branding',
      recommendation: 'Review deployed site for brand compliance',
    });
    complianceScore -= 5;
  }

  // Determine compliance status
  let complianceStatus = 'compliant';
  if (violations.length > 0) {
    const hasCritical = violations.some(v => v.severity === 'critical');
    const hasHigh = violations.some(v => v.severity === 'high');
    
    if (hasCritical || complianceScore < 50) {
      complianceStatus = 'severe_violation';
    } else if (hasHigh || complianceScore < 70) {
      complianceStatus = 'violation';
    } else {
      complianceStatus = 'minor_issues';
    }
  } else if (warnings.length > 0) {
    complianceStatus = 'needs_review';
  }

  return {
    ...forkInfo,
    violations,
    warnings,
    complianceScore: Math.max(0, complianceScore),
    complianceStatus,
    scanTimestamp: new Date().toISOString(),
  };
}

/**
 * Generate fork scanning report
 */
function generateForkReport(results) {
  const severeViolations = results.filter(r => r.complianceStatus === 'severe_violation');
  const violations = results.filter(r => r.complianceStatus === 'violation');
  const minorIssues = results.filter(r => r.complianceStatus === 'minor_issues');
  const needsReview = results.filter(r => r.complianceStatus === 'needs_review');
  const compliant = results.filter(r => r.complianceStatus === 'compliant');

  const report = {
    summary: {
      totalForks: results.length,
      severeViolations: severeViolations.length,
      violations: violations.length,
      minorIssues: minorIssues.length,
      needsReview: needsReview.length,
      compliant: compliant.length,
    },
    severeViolations: severeViolations.map(r => ({
      fork: r.fullName,
      url: r.url,
      score: r.complianceScore,
      violations: r.violations,
      action: 'IMMEDIATE ACTION REQUIRED',
    })),
    violations: violations.map(r => ({
      fork: r.fullName,
      url: r.url,
      score: r.complianceScore,
      violations: r.violations,
      action: 'Contact owner and request compliance',
    })),
    needsReview: needsReview.map(r => ({
      fork: r.fullName,
      url: r.url,
      warnings: r.warnings,
      action: 'Manual review recommended',
    })),
    recommendations: generateReportRecommendations(severeViolations, violations),
    generatedAt: new Date().toISOString(),
  };

  return report;
}

/**
 * Generate recommendations based on scan results
 */
function generateReportRecommendations(severe, violations) {
  const recommendations = [];

  if (severe.length > 0) {
    recommendations.push({
      priority: 'CRITICAL',
      action: `Review ${severe.length} fork(s) with severe violations`,
      details: 'These forks may require DMCA takedown notices',
      steps: [
        'Document all violations with screenshots',
        'Attempt contact with repository owner',
        'Prepare DMCA notice using template if no response',
        'Consult legal team for critical violations',
      ],
    });
  }

  if (violations.length > 0) {
    recommendations.push({
      priority: 'HIGH',
      action: `Contact ${violations.length} fork owner(s) about violations`,
      details: 'Request compliance with CLA rebranding requirements',
      steps: [
        'Open issue in fork repository explaining violations',
        'Reference CLA.md and rebranding requirements',
        'Offer help with compliance',
        'Set 14-day deadline for response',
      ],
    });
  }

  recommendations.push({
    priority: 'ONGOING',
    action: 'Maintain regular fork scanning',
    details: 'Run scanner weekly to catch new violations early',
    steps: [
      'Schedule automated scans',
      'Review new forks within 48 hours',
      'Document compliant forks for reference',
      'Update CLA.md if common issues found',
    ],
  });

  return recommendations;
}

/**
 * Get specific fork analysis
 */
async function analyzeSingleFork(owner, repo) {
  try {
    const fork = {
      owner: { login: owner },
      name: repo,
      full_name: `${owner}/${repo}`,
      html_url: `https://github.com/${owner}/${repo}`,
      description: '',
      homepage: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      stargazers_count: 0,
      has_pages: false,
    };

    return await analyzeFork(fork);
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Sleep utility for rate limiting
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get fork scanner statistics
 */
function getForkScannerStats() {
  return {
    capabilities: [
      'Scan all repository forks',
      'Check repository names',
      'Analyze README content',
      'Review package.json branding',
      'Detect false official claims',
      'Assess compliance scores',
    ],
    checks: [
      'Repository name compliance',
      'Description attribution',
      'README attribution',
      'Package name compliance',
      'Homepage domain check',
      'GitHub Pages deployment',
    ],
    apiLimits: {
      rateLimit: '60 requests/hour (unauthenticated)',
      authenticated: '5000 requests/hour (with GITHUB_TOKEN)',
      recommendation: 'Set GITHUB_TOKEN for higher limits',
    },
  };
}

module.exports = {
  scanAllForks,
  analyzeFork,
  analyzeSingleFork,
  generateForkReport,
  getForkScannerStats,
  REPO_CONFIG,
};
