/**
 * Cofacts Community Integration
 * Source: github.com/cofacts/rumors-api
 *
 * Purpose: Crowdsourced fact-checking from Taiwan's g0v civic tech community
 * Use case: Check if app claims have been flagged as rumors/misinformation
 *
 * License: MIT
 */

const axios = require('axios');

// Cofacts GraphQL API endpoint (public, no auth needed)
const COFACTS_ENDPOINT = process.env.COFACTS_ENDPOINT || 'https://cofacts-api.g0v.tw/graphql';

/**
 * Query Cofacts for similar claims
 */
async function queryWithCofacts(claimText, options = {}) {
  try {
    const query = `
      query SearchArticles($text: String!, $limit: Int) {
        ListArticles(
          filter: {
            moreLikeThis: { like: $text, minimumShouldMatch: "0%" }
          }
          orderBy: [{ _score: DESC }]
          first: $limit
        ) {
          edges {
            node {
              id
              text
              createdAt
              articleReplies(status: NORMAL) {
                reply {
                  id
                  type
                  text
                  createdAt
                }
                status
                createdAt
                user {
                  id
                  name
                }
              }
              replyRequestCount
              replyCount
            }
            score
          }
        }
      }
    `;

    const response = await axios.post(
      COFACTS_ENDPOINT,
      {
        query,
        variables: {
          text: claimText,
          limit: options.limit || 10
        }
      },
      {
        timeout: options.timeout || 5000,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'AppWhistler/1.0'
        }
      }
    );

    if (response.data.errors) {
      throw new Error(`Cofacts GraphQL error: ${response.data.errors[0].message}`);
    }

    const articles = response.data.data.ListArticles.edges;

    return {
      articles: articles.map(edge => ({
        id: edge.node.id,
        text: edge.node.text,
        createdAt: edge.node.createdAt,
        replies: edge.node.articleReplies.map(ar => ({
          id: ar.reply.id,
          type: ar.reply.type, // 'RUMOR', 'NOT_RUMOR', 'OPINIONATED', 'NOT_ARTICLE'
          text: ar.reply.text,
          createdAt: ar.reply.createdAt,
          status: ar.status,
          user: ar.user
        })),
        replyRequestCount: edge.node.replyRequestCount,
        replyCount: edge.node.replyCount,
        similarityScore: edge.score
      })),
      metadata: {
        queriedAt: new Date().toISOString(),
        source: 'COFACTS_API'
      }
    };
  } catch (error) {
    console.error('[Cofacts Integration] Query failed:', error.message);
    throw error;
  }
}

/**
 * Analyze claims with Cofacts (main export for orchestrator)
 */
async function analyzeWithCofacts(claimTexts, options = {}) {
  try {
    // If single claim, convert to array
    const claims = Array.isArray(claimTexts) ? claimTexts : [claimTexts];

    // Query Cofacts for each claim
    const results = await Promise.all(
      claims.map(claim => queryWithCofacts(claim, options))
    );

    // Flatten all articles
    const allArticles = results.flatMap(r => r.articles);

    if (allArticles.length === 0) {
      return {
        fakeScore: 0,
        confidence: 30, // Low confidence when no community data
        verdict: 'NO_COMMUNITY_DATA',
        communityAnalysis: {
          totalSimilarClaims: 0,
          rumorFlags: 0,
          notRumorFlags: 0,
          opinionatedFlags: 0,
          communityConsensus: 'NONE'
        },
        similarClaims: [],
        redFlags: []
      };
    }

    // Analyze community responses
    const rumorArticles = allArticles.filter(a =>
      a.replies.some(r => r.type === 'RUMOR')
    );

    const notRumorArticles = allArticles.filter(a =>
      a.replies.some(r => r.type === 'NOT_RUMOR')
    );

    const opinionatedArticles = allArticles.filter(a =>
      a.replies.some(r => r.type === 'OPINIONATED')
    );

    // Calculate consensus
    const totalWithReplies = allArticles.filter(a => a.replies.length > 0).length;
    const rumorRate = totalWithReplies > 0 ? (rumorArticles.length / totalWithReplies) : 0;
    const notRumorRate = totalWithReplies > 0 ? (notRumorArticles.length / totalWithReplies) : 0;

    // Calculate fake score based on community consensus
    let fakeScore = 0;
    let consensus = 'MIXED';

    if (rumorRate > 0.6) {
      fakeScore = 70 + (rumorRate - 0.6) * 75; // 70-100
      consensus = 'LIKELY_RUMOR';
    } else if (rumorRate > 0.4) {
      fakeScore = 40 + (rumorRate - 0.4) * 150; // 40-70
      consensus = 'POSSIBLY_RUMOR';
    } else if (notRumorRate > 0.6) {
      fakeScore = 10 + (1 - notRumorRate) * 25; // 0-20
      consensus = 'LIKELY_NOT_RUMOR';
    } else {
      fakeScore = 30 + (rumorRate - notRumorRate) * 50; // 20-40
      consensus = 'MIXED';
    }

    // Higher confidence with more community data
    const confidence = Math.min(50 + totalWithReplies * 5, 90);

    return {
      fakeScore: Math.round(fakeScore),
      confidence,
      verdict: fakeScore >= 70 ? 'LIKELY_FAKE' :
               fakeScore >= 40 ? 'SUSPICIOUS' :
               'LIKELY_GENUINE',
      communityAnalysis: {
        totalSimilarClaims: allArticles.length,
        rumorFlags: rumorArticles.length,
        notRumorFlags: notRumorArticles.length,
        opinionatedFlags: opinionatedArticles.length,
        communityConsensus: consensus,
        rumorRate,
        notRumorRate
      },
      similarClaims: allArticles.slice(0, 5).map(a => ({
        text: a.text.substring(0, 200),
        replies: a.replies.length,
        flaggedAsRumor: a.replies.some(r => r.type === 'RUMOR'),
        similarityScore: a.similarityScore
      })),
      detailedArticles: allArticles,
      redFlags: generateCofactsRedFlags(allArticles, rumorArticles, consensus)
    };
  } catch (error) {
    console.error('[Cofacts Integration] Analysis failed:', error.message);
    return null;
  }
}

/**
 * Generate red flags based on Cofacts analysis
 */
function generateCofactsRedFlags(allArticles, rumorArticles, consensus) {
  const flags = [];

  if (rumorArticles.length > 0) {
    const severity = rumorArticles.length >= 3 ? 'CRITICAL' :
                     rumorArticles.length >= 2 ? 'HIGH' : 'MEDIUM';

    flags.push({
      category: 'Community Fact-Check',
      severity,
      description: `${rumorArticles.length} similar claim(s) flagged as rumors by g0v community`
    });
  }

  if (consensus === 'LIKELY_RUMOR') {
    flags.push({
      category: 'Strong Community Consensus',
      severity: 'HIGH',
      description: 'Strong community consensus that similar claims are false'
    });
  }

  // Find articles with many fact-check requests but few replies (suspicious)
  const highDemandLowReply = allArticles.filter(a =>
    a.replyRequestCount > 5 && a.replyCount < 2
  );

  if (highDemandLowReply.length > 0) {
    flags.push({
      category: 'High Fact-Check Demand',
      severity: 'MEDIUM',
      description: `${highDemandLowReply.length} similar claim(s) have many fact-check requests (likely suspicious)`
    });
  }

  // Find recurring rumors (same claim appears multiple times)
  if (allArticles.length > 3) {
    flags.push({
      category: 'Recurring Claim',
      severity: 'MEDIUM',
      description: `Similar claim appears ${allArticles.length} times in community database (may be coordinated)`
    });
  }

  // Recent rumors (within last 30 days)
  const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
  const recentRumors = rumorArticles.filter(a =>
    new Date(a.createdAt).getTime() > thirtyDaysAgo
  );

  if (recentRumors.length > 0) {
    flags.push({
      category: 'Recent Misinformation',
      severity: 'HIGH',
      description: `${recentRumors.length} similar rumor(s) flagged in the last 30 days`
    });
  }

  return flags;
}

/**
 * Extract claims from app description for Cofacts checking
 */
function extractClaims(appDescription) {
  const claims = [];

  // Split by sentence
  const sentences = appDescription.split(/[.!?]+/).filter(s => s.trim().length > 0);

  // Extract sentences that make strong claims
  const claimPatterns = [
    /\b(cure|treat|prevent|eliminate|guarantee|proven|certified|official|endorsed)\b/i,
    /\b(best|top|#1|fastest|easiest|most powerful)\b/i,
    /\b(save|earn|make|lose|gain) \$?\d+/i,
    /\b(trusted by|used by) \d+ (million|thousand|users|people)/i
  ];

  sentences.forEach(sentence => {
    const hasClaimPattern = claimPatterns.some(p => p.test(sentence));
    if (hasClaimPattern && sentence.length > 20) {
      claims.push(sentence.trim());
    }
  });

  return claims.length > 0 ? claims : [appDescription]; // Fallback to full description
}

/**
 * Analyze app description claims with Cofacts
 */
async function analyzeAppDescription(appDescription, options = {}) {
  try {
    // Extract claims from description
    const claims = extractClaims(appDescription);

    console.log(`[Cofacts] Extracted ${claims.length} claim(s) from app description`);

    // Analyze all claims
    const result = await analyzeWithCofacts(claims, options);

    return {
      ...result,
      extractedClaims: claims,
      claimsAnalyzed: claims.length
    };
  } catch (error) {
    console.error('[Cofacts Integration] App description analysis failed:', error.message);
    return null;
  }
}

/**
 * Batch analysis for multiple app descriptions
 */
async function batchAnalyzeWithCofacts(appDescriptions, options = {}) {
  const results = [];
  const delay = options.delayMs || 500; // Rate limit API calls

  for (const description of appDescriptions) {
    const result = await analyzeAppDescription(description, options);
    results.push({ description: description.substring(0, 100), result });

    // Delay between requests
    if (appDescriptions.indexOf(description) < appDescriptions.length - 1) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  return results;
}

/**
 * Health check for Cofacts API
 */
async function checkCofactsHealth() {
  try {
    const response = await axios.post(
      COFACTS_ENDPOINT,
      {
        query: '{ __typename }'
      },
      { timeout: 3000 }
    );

    return {
      available: response.data.data.__typename === 'Query',
      endpoint: COFACTS_ENDPOINT,
      status: 'operational'
    };
  } catch (error) {
    return {
      available: false,
      endpoint: COFACTS_ENDPOINT,
      error: error.message
    };
  }
}

module.exports = {
  analyzeWithCofacts,
  analyzeAppDescription,
  queryWithCofacts,
  extractClaims,
  batchAnalyzeWithCofacts,
  checkCofactsHealth
};
