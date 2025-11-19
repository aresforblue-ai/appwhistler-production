// src/ai/sourceCredibility.js
// Rank external sources by reliability using domain authority heuristics

/**
 * Source Credibility Scoring Engine
 * Ranks sources 0-100 based on domain authority, SSL, age, and known credibility lists
 * 
 * Usage:
 * const score = scoreSource('https://www.nytimes.com');
 * // Returns: { score: 92, tier: 'trusted', factors: {...} }
 */

// Known credible sources (verified fact-checkers and publishers)
const CREDIBLE_DOMAINS = {
  // Major news outlets
  'bbc.com': 95,
  'bbc.co.uk': 95,
  'nytimes.com': 93,
  'wsj.com': 93,
  'reuters.com': 92,
  'apnews.com': 92,
  'theguardian.com': 90,
  'npr.org': 90,
  'propublica.org': 88,
  'washingtonpost.com': 92,
  'ft.com': 91,
  'economist.com': 91,

  // Fact-checking organizations (highest trust)
  'snopes.com': 96,
  'factcheck.org': 96,
  'politifact.com': 95,
  'fullfact.org': 95,
  'chequeado.com': 94,
  'pagella.notizie.it': 94,
  'maldita.es': 94,

  // Academic and research institutions
  'stanford.edu': 94,
  'harvard.edu': 94,
  'mit.edu': 94,
  'cambridge.org': 94,
  'nature.com': 93,
  'science.org': 93,
  'arxiv.org': 90,

  // Government and official sources
  'gov.uk': 92,
  'gov.au': 92,
  'whitehouse.gov': 90,
  'cdc.gov': 93,
  'who.int': 92,
  'fda.gov': 91,

  // Medical/Health
  'healthline.com': 85,
  'mayoclinic.org': 88,
  'webmd.com': 82,
  'ncbi.nlm.nih.gov': 92,
};

// Known unreliable sources
const UNRELIABLE_DOMAINS = new Set([
  'infowars.com',
  'naturalnews.com',
  'beforeitsnews.com',
  'conspiracy-based-site.com',
  'fake-news-site.com',
]);

/**
 * Extract domain from URL
 * @param {string} url - Full URL
 * @returns {string} Domain without protocol
 */
const extractDomain = (url) => {
  if (!url) return '';
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, '');
  } catch (err) {
    return '';
  }
};

/**
 * Calculate domain age score (older domains = more trustworthy)
 * Assumes domain registration history available (in production, use WHOIS API)
 * @param {string} domain - Domain name
 * @returns {number} Score 0-20
 */
const calculateDomainAgeScore = (domain) => {
  // Established news outlets and fact-checkers get bonus points
  if (CREDIBLE_DOMAINS[domain]) {
    return 15;
  }

  // New domains get penalized
  const hasNewTLD = /\.(xyz|trade|download|stream|click)$/.test(domain);
  if (hasNewTLD) {
    return 2;
  }

  // Standard TLDs get moderate score
  return 8;
};

/**
 * Check if URL uses HTTPS
 * @param {string} url - Full URL
 * @returns {number} Score (20 for HTTPS, 5 for HTTP)
 */
const calculateHTTPSScore = (url) => {
  if (!url) return 0;
  return url.startsWith('https') ? 20 : 5;
};

/**
 * Evaluate URL structure for professionalism
 * @param {string} url - Full URL
 * @returns {number} Score 0-15
 */
const calculateURLStructureScore = (url) => {
  if (!url) return 0;

  const urlObj = new URL(url);
  const hostname = urlObj.hostname;

  // Professional structure
  let score = 10;

  // Deduct for suspicious characteristics
  if (hostname.includes('bit.ly') || hostname.includes('tinyurl')) score -= 2;
  if (hostname.includes('redirect') || hostname.includes('short-url')) score -= 3;
  if (hostname.includes('-.') || hostname.includes('--')) score -= 2;
  if (urlObj.pathname.includes('..') || urlObj.pathname.includes('//')) score -= 3;

  return Math.max(0, score);
};

/**
 * Main scoring function
 * @param {string} url - Source URL to evaluate
 * @returns {object} Credibility score and breakdown
 *   - score: 0-100 overall score
 *   - tier: 'highly-trusted' | 'trusted' | 'moderate' | 'low' | 'unreliable'
 *   - factors: breakdown of scoring components
 *   - recommendation: brief text recommendation
 */
export const scoreSource = (url) => {
  const domain = extractDomain(url);

  // Check unreliable list first
  if (UNRELIABLE_DOMAINS.has(domain)) {
    return {
      score: 5,
      tier: 'unreliable',
      factors: {
        knownUnreliable: 0,
        domainAge: 0,
        https: 0,
        urlStructure: 0,
      },
      recommendation: 'This source is known to spread misinformation. Verify with trusted sources.',
    };
  }

  // Check credible list
  const knownScore = CREDIBLE_DOMAINS[domain];

  if (knownScore) {
    return {
      score: knownScore,
      tier: 'highly-trusted',
      factors: {
        knownCredible: knownScore,
        domainAge: 0, // Bonus already included
        https: 0,
        urlStructure: 0,
      },
      recommendation: 'Credible source. Safe to cite.',
    };
  }

  // Calculate score for unknown sources
  const domainAgeScore = calculateDomainAgeScore(domain);
  const httpsScore = calculateHTTPSScore(url);
  const urlStructureScore = calculateURLStructureScore(url);

  // Weighted calculation (out of 100)
  const score =
    domainAgeScore * 1.5 + // 30 max
    httpsScore * 1.5 + // 30 max
    urlStructureScore * 2; // 30 max

  // Determine tier
  let tier;
  if (score >= 80) tier = 'highly-trusted';
  else if (score >= 60) tier = 'trusted';
  else if (score >= 40) tier = 'moderate';
  else if (score >= 20) tier = 'low';
  else tier = 'unreliable';

  // Generate recommendation
  let recommendation;
  if (tier === 'highly-trusted') recommendation = 'Strong source for citation.';
  else if (tier === 'trusted') recommendation = 'Good source for fact-checking.';
  else if (tier === 'moderate') recommendation = 'Cross-reference with trusted sources.';
  else if (tier === 'low') recommendation = 'Low credibility. Verify with multiple trusted sources.';
  else recommendation = 'Not recommended for factual claims.';

  return {
    score: Math.round(score),
    tier,
    factors: {
      domainAge: domainAgeScore,
      https: httpsScore,
      urlStructure: urlStructureScore,
    },
    recommendation,
  };
};

/**
 * Score multiple sources and average
 * @param {string[]} urls - Array of source URLs
 * @returns {object} Average score and individual scores
 */
export const scoreMultipleSources = (urls) => {
  if (!urls || urls.length === 0) {
    return {
      averageScore: 0,
      tier: 'no-sources',
      scores: [],
      recommendation: 'No sources provided.',
    };
  }

  const scores = urls.map(scoreSource);
  const averageScore = Math.round(scores.reduce((sum, s) => sum + s.score, 0) / scores.length);

  // Determine overall tier
  let tier = 'low';
  if (averageScore >= 80) tier = 'highly-trusted';
  else if (averageScore >= 60) tier = 'trusted';
  else if (averageScore >= 40) tier = 'moderate';

  return {
    averageScore,
    tier,
    scores,
    recommendation: scores[0]?.recommendation || 'Verify sources.',
  };
};

/**
 * Format source credibility for display
 * @param {number} score - Credibility score 0-100
 * @returns {object} Display object with color and label
 */
export const formatCredibility = (score) => {
  if (score >= 80)
    return { label: 'Highly Trusted', color: 'bg-green-100 text-green-800', icon: '✓' };
  if (score >= 60)
    return { label: 'Trusted', color: 'bg-blue-100 text-blue-800', icon: '✓' };
  if (score >= 40)
    return { label: 'Moderate', color: 'bg-yellow-100 text-yellow-800', icon: '?' };
  if (score >= 20)
    return { label: 'Low', color: 'bg-orange-100 text-orange-800', icon: '⚠' };
  return { label: 'Unreliable', color: 'bg-red-100 text-red-800', icon: '✗' };
};

export default {
  scoreSource,
  scoreMultipleSources,
  formatCredibility,
  CREDIBLE_DOMAINS,
  UNRELIABLE_DOMAINS,
};
