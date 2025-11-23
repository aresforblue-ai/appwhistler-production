/**
 * Check-up Scraper Integration
 * Source: github.com/aosfatos/check-up (inferred from Aos Fatos journalism project)
 *
 * Purpose: Real-time scraping of app pages, ads, and claims
 * Detects misinformation patterns like "miracle cure", "guaranteed results", etc.
 *
 * License: MIT
 */

const axios = require('axios');
const logger = require('../utils/logger');

// Check-up API endpoint (deployed separately)
const CHECKUP_ENDPOINT = process.env.CHECKUP_ENDPOINT || 'http://localhost:5004/scrape';

/**
 * Scrape and analyze a URL for misinformation claims
 */
async function scrapeWithCheckup(url, options = {}) {
  try {
    const response = await axios.post(
      CHECKUP_ENDPOINT,
      {
        url,
        scrape_ads: options.scrapeAds !== false,
        classify_theme: options.classifyTheme !== false,
        extract_claims: options.extractClaims !== false,
        depth: options.depth || 1 // How many levels deep to scrape
      },
      {
        timeout: options.timeout || 8000,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'AppWhistler-Bot/1.0'
        }
      }
    );

    return {
      hasMisinfo: response.data.has_misinfo || false,
      disinfoScore: response.data.disinfo_score || 0,
      flaggedClaims: response.data.flagged_claims || [],
      scrapedAds: response.data.ads || [],
      themeClassification: response.data.theme || null,
      metadata: {
        scrapedAt: new Date().toISOString(),
        source: 'CHECKUP_API'
      }
    };
  } catch (error) {
    logger.error('[Check-up Integration] Scraping failed:', error.message);

    // Fallback to basic pattern matching
    if (options.allowFallback !== false) {
      logger.info('[Check-up Integration] Using fallback pattern matcher');
      return scrapeWithFallback(url);
    }

    throw error;
  }
}

/**
 * Fallback scraper using lightweight pattern matching
 */
async function scrapeWithFallback(url) {
  try {
    // Fetch the page content
    const response = await axios.get(url, {
      timeout: 5000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AppWhistler/1.0)'
      }
    });

    const htmlContent = response.data;
    const text = stripHtml(htmlContent).toLowerCase();

    // Detect misinformation patterns
    const misinfoPatterns = [
      // Health claims
      { pattern: /(miracle|magical) (cure|solution|remedy)/i, weight: 40, category: 'Health' },
      { pattern: /cure(s)? (cancer|diabetes|covid|aids)/i, weight: 50, category: 'Health' },
      { pattern: /(guaranteed|100%) (weight loss|cure|results)/i, weight: 35, category: 'Health' },

      // Financial scams
      { pattern: /(make|earn) \$\d+ (per|a) (day|hour|week) (from home)?/i, weight: 45, category: 'Financial' },
      { pattern: /(guaranteed|risk-free) (profits|returns|income)/i, weight: 40, category: 'Financial' },
      { pattern: /work from home .{0,30}(make|earn) .{0,20}\$\d+/i, weight: 35, category: 'Financial' },

      // Privacy violations
      { pattern: /(collect|harvest|sell) (your|user) (data|information|personal)/i, weight: 30, category: 'Privacy' },
      { pattern: /(track|monitor) (you|users) (24\/7|constantly|always)/i, weight: 25, category: 'Privacy' },

      // Fake urgency
      { pattern: /(limited time|act now|expire(s)? soon|hurry|last chance)/i, weight: 20, category: 'Urgency' },
      { pattern: /only \d+ (left|remaining|available)/i, weight: 25, category: 'Urgency' },

      // Deceptive claims
      { pattern: /(this|one) (weird|simple|secret) (trick|tip|method)/i, weight: 30, category: 'Deceptive' },
      { pattern: /(doctor|scientist|expert)s? (hate|don't want you to know)/i, weight: 35, category: 'Deceptive' },

      // Government/conspiracy
      { pattern: /(government|fbi|cia) (hiding|covering up|doesn't want)/i, weight: 40, category: 'Conspiracy' },
      { pattern: /big (pharma|tech|oil) (hiding|suppressing)/i, weight: 35, category: 'Conspiracy' }
    ];

    const flaggedClaims = [];
    let disinfoScore = 0;

    misinfoPatterns.forEach(({ pattern, weight, category }) => {
      const matches = text.match(pattern);
      if (matches) {
        flaggedClaims.push({
          text: matches[0],
          category,
          severity: weight >= 40 ? 'HIGH' : weight >= 25 ? 'MEDIUM' : 'LOW',
          pattern: pattern.toString()
        });
        disinfoScore += weight;
      }
    });

    // Cap at 100
    disinfoScore = Math.min(disinfoScore, 100);

    return {
      hasMisinfo: disinfoScore > 30,
      disinfoScore,
      flaggedClaims,
      scrapedAds: [],
      themeClassification: classifyTheme(flaggedClaims),
      metadata: {
        scrapedAt: new Date().toISOString(),
        source: 'FALLBACK_SCRAPER'
      }
    };
  } catch (error) {
    logger.error('[Check-up Fallback] Failed to scrape URL:', error.message);
    return {
      hasMisinfo: false,
      disinfoScore: 0,
      flaggedClaims: [],
      scrapedAds: [],
      themeClassification: null,
      metadata: {
        error: error.message,
        source: 'FALLBACK_SCRAPER'
      }
    };
  }
}

/**
 * Strip HTML tags for text analysis
 */
function stripHtml(html) {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Classify the theme based on flagged claims
 */
function classifyTheme(flaggedClaims) {
  if (flaggedClaims.length === 0) return 'CLEAN';

  const categories = flaggedClaims.map(c => c.category);
  const counts = {};
  categories.forEach(cat => counts[cat] = (counts[cat] || 0) + 1);

  const topCategory = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])[0];

  return topCategory ? topCategory[0].toUpperCase() : 'MIXED';
}

/**
 * Analyze app URL with Check-up (main export for orchestrator)
 */
async function analyzeWithCheckup(url, metadata = {}) {
  try {
    const result = await scrapeWithCheckup(url, {
      timeout: metadata.timeout || 8000,
      scrapeAds: metadata.scrapeAds !== false,
      classifyTheme: metadata.classifyTheme !== false,
      allowFallback: metadata.allowFallback !== false
    });

    return {
      fakeScore: result.disinfoScore,
      confidence: result.flaggedClaims.length > 0 ? 70 : 50,
      verdict: result.disinfoScore >= 70 ? 'LIKELY_FAKE' :
               result.disinfoScore >= 40 ? 'SUSPICIOUS' :
               result.disinfoScore >= 20 ? 'POTENTIALLY_SUSPICIOUS' :
               'LIKELY_GENUINE',
      claimAnalysis: {
        hasMisinformation: result.hasMisinfo,
        disinfoScore: result.disinfoScore,
        flaggedClaims: result.flaggedClaims,
        theme: result.themeClassification
      },
      ads: result.scrapedAds,
      metadata: result.metadata,
      redFlags: generateCheckupRedFlags(result)
    };
  } catch (error) {
    logger.error('[Check-up Integration] Analysis failed:', error.message);
    return null;
  }
}

/**
 * Generate red flags based on Check-up analysis
 */
function generateCheckupRedFlags(checkupResult) {
  const flags = [];

  if (checkupResult.hasMisinfo) {
    flags.push({
      category: 'Misinformation Claims',
      severity: checkupResult.disinfoScore >= 70 ? 'CRITICAL' :
                checkupResult.disinfoScore >= 40 ? 'HIGH' : 'MEDIUM',
      description: `Found ${checkupResult.flaggedClaims.length} suspicious claim(s) on app page`
    });
  }

  // Flag specific claim types
  const healthClaims = checkupResult.flaggedClaims.filter(c => c.category === 'Health');
  if (healthClaims.length > 0) {
    flags.push({
      category: 'Health Misinformation',
      severity: 'CRITICAL',
      description: `App makes ${healthClaims.length} unverified health claim(s): "${healthClaims[0].text}"`
    });
  }

  const financialScams = checkupResult.flaggedClaims.filter(c => c.category === 'Financial');
  if (financialScams.length > 0) {
    flags.push({
      category: 'Financial Scam Indicators',
      severity: 'HIGH',
      description: `Detected get-rich-quick or scam patterns: "${financialScams[0].text}"`
    });
  }

  const privacyClaims = checkupResult.flaggedClaims.filter(c => c.category === 'Privacy');
  if (privacyClaims.length > 0) {
    flags.push({
      category: 'Privacy Concerns',
      severity: 'HIGH',
      description: `App description mentions data harvesting: "${privacyClaims[0].text}"`
    });
  }

  if (checkupResult.scrapedAds.length > 10) {
    flags.push({
      category: 'Excessive Advertising',
      severity: 'MEDIUM',
      description: `App page contains ${checkupResult.scrapedAds.length} ads (possible ad fraud)`
    });
  }

  if (checkupResult.metadata.source === 'FALLBACK_SCRAPER') {
    flags.push({
      category: 'Analysis Method',
      severity: 'INFO',
      description: 'Check-up API unavailable - used basic pattern matching (lower accuracy)'
    });
  }

  return flags;
}

/**
 * Batch analysis for multiple URLs
 */
async function batchAnalyzeWithCheckup(urls, options = {}) {
  const results = [];
  const delay = options.delayMs || 1000; // Rate limit scraping

  for (const url of urls) {
    const result = await analyzeWithCheckup(url, options);
    results.push({ url, result });

    // Delay between requests to avoid overwhelming target servers
    if (urls.indexOf(url) < urls.length - 1) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  return results;
}

/**
 * Health check for Check-up API
 */
async function checkCheckupHealth() {
  try {
    const response = await axios.get(`${CHECKUP_ENDPOINT.replace('/scrape', '')}/health`, { timeout: 3000 });
    return {
      available: true,
      endpoint: CHECKUP_ENDPOINT,
      status: response.data
    };
  } catch (error) {
    return {
      available: false,
      endpoint: CHECKUP_ENDPOINT,
      error: error.message
    };
  }
}

module.exports = {
  analyzeWithCheckup,
  scrapeWithCheckup,
  scrapeWithFallback,
  batchAnalyzeWithCheckup,
  checkCheckupHealth
};
