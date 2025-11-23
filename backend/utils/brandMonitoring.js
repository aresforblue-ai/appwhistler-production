/**
 * Brand Monitoring Utilities
 * 
 * Provides tools for monitoring AppWhistler brand usage across the web
 * and detecting potential trademark infringement.
 * 
 * Features:
 * - Google Alerts integration guide
 * - Grok API integration for AI-powered brand scanning
 * - Fork repository scanning
 * - Brand mention tracking
 */

const https = require('https');

/**
 * Configuration for brand monitoring
 */
const BRAND_CONFIG = {
  brandName: 'AppWhistler',
  brandVariations: [
    'AppWhistler',
    'App Whistler',
    'AppWhistl',
    'Appwhistler',
    'app-whistler',
    'appwhistler',
  ],
  officialDomains: [
    'appwhistler.com',
    'github.com/aresforblue-ai/appwhistler-production',
  ],
  officialUrls: [
    'https://github.com/aresforblue-ai/appwhistler-production',
  ],
};

/**
 * Google Alerts Setup Guide
 * Returns instructions for setting up free Google Alerts for brand monitoring
 */
function getGoogleAlertsGuide() {
  return {
    title: 'Setting Up Google Alerts for AppWhistler Brand Monitoring',
    steps: [
      {
        step: 1,
        action: 'Visit Google Alerts',
        url: 'https://www.google.com/alerts',
        description: 'Navigate to Google Alerts in your browser',
      },
      {
        step: 2,
        action: 'Create Alert for Brand Name',
        query: '"AppWhistler"',
        description: 'Enter "AppWhistler" in quotes to match exact phrase',
        settings: {
          frequency: 'As-it-happens',
          sources: 'Automatic',
          language: 'English',
          region: 'Any region',
          howMany: 'All results',
          deliverTo: 'Email address',
        },
      },
      {
        step: 3,
        action: 'Create Alert for Variations',
        queries: [
          '"App Whistler"',
          'AppWhistler OR "App Whistler" -site:github.com/aresforblue-ai',
          'AppWhistler app recommendation',
          'AppWhistler truth verification',
        ],
        description: 'Set up additional alerts for brand variations',
      },
      {
        step: 4,
        action: 'Monitor GitHub Activity',
        query: 'site:github.com AppWhistler -site:github.com/aresforblue-ai/appwhistler-production',
        description: 'Track forks and mentions on GitHub',
      },
      {
        step: 5,
        action: 'Track Domain Registration',
        queries: [
          'appwhistler.com',
          'appwhistler.app',
          'appwhistler.io',
          'app-whistler.com',
        ],
        description: 'Monitor potential domain squatting',
      },
    ],
    tips: [
      'Set up alerts for misspellings and variations',
      'Monitor social media platforms separately',
      'Review alerts weekly for false positives',
      'Document all legitimate uses for reference',
      'Act quickly on potential infringements',
    ],
  };
}

/**
 * Grok API Integration
 * Integrates with Grok API for AI-powered brand monitoring
 * Falls back to mock data if API key not configured
 */
async function scanWithGrokAPI(query, options = {}) {
  const grokApiKey = process.env.GROK_API_KEY || null;
  
  // Mock response for development/testing
  if (!grokApiKey) {
    console.log('[Brand Monitor] Grok API key not configured, using mock data');
    return getMockGrokResponse(query);
  }

  const prompt = `Scan for brand misuse: ${query}. Analyze if this content:
1. Uses "AppWhistler" trademark without authorization
2. Claims to be official AppWhistler or affiliated
3. Violates rebranding requirements for forks
4. Contains potentially infringing use of branding
5. Shows evidence of commercial exploitation

Provide a threat assessment (low/medium/high) and specific concerns.`;

  try {
    const response = await callGrokAPI(prompt, grokApiKey);
    return parseGrokResponse(response, query);
  } catch (error) {
    console.error('[Brand Monitor] Grok API error:', error);
    return {
      success: false,
      error: error.message,
      fallback: getMockGrokResponse(query),
    };
  }
}

/**
 * Call Grok API (xAI)
 * @private
 */
function callGrokAPI(prompt, apiKey) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      model: 'grok-beta',
      messages: [
        {
          role: 'system',
          content: 'You are a brand protection specialist analyzing potential trademark infringement.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
    });

    const options = {
      hostname: 'api.x.ai',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Content-Length': data.length,
      },
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve(parsed);
        } catch (e) {
          reject(new Error('Failed to parse Grok API response'));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

/**
 * Parse Grok API response into structured format
 * @private
 */
function parseGrokResponse(response, query) {
  if (!response.choices || response.choices.length === 0) {
    return getMockGrokResponse(query);
  }

  const content = response.choices[0].message.content;
  
  // Extract threat level (simple pattern matching)
  let threatLevel = 'low';
  if (content.toLowerCase().includes('high risk') || content.toLowerCase().includes('threat: high')) {
    threatLevel = 'high';
  } else if (content.toLowerCase().includes('medium risk') || content.toLowerCase().includes('threat: medium')) {
    threatLevel = 'medium';
  }

  return {
    success: true,
    query,
    threatLevel,
    analysis: content,
    timestamp: new Date().toISOString(),
    source: 'grok-api',
  };
}

/**
 * Mock Grok response for development
 * @private
 */
function getMockGrokResponse(query) {
  return {
    success: true,
    query,
    threatLevel: 'low',
    analysis: `[MOCK RESPONSE - Grok API not configured]
    
Analysis of query: "${query}"

Threat Assessment: LOW

Findings:
1. No immediate trademark violations detected
2. Usage appears to be for reference/educational purposes
3. No evidence of commercial exploitation
4. Attribution to original project appears present

Recommendations:
- Continue monitoring
- No immediate action required
- Verify compliance with CLA requirements

Note: This is a mock response. Configure GROK_API_KEY for real analysis.`,
    timestamp: new Date().toISOString(),
    source: 'mock',
    mock: true,
  };
}

/**
 * Analyze a URL or content for brand violations
 */
async function analyzeBrandUsage(url, content = null) {
  const issues = [];
  const brandVariations = BRAND_CONFIG.brandVariations;

  // Check if it's an official URL
  const isOfficial = BRAND_CONFIG.officialUrls.some(official => 
    url.includes(official)
  );

  if (isOfficial) {
    return {
      url,
      status: 'official',
      issues: [],
      threatLevel: 'none',
      message: 'This is an official AppWhistler URL',
    };
  }

  // Check for brand name usage
  const lowerContent = (content || '').toLowerCase();
  const lowerUrl = url.toLowerCase();
  
  let brandMentions = 0;
  brandVariations.forEach(variant => {
    if (lowerContent.includes(variant.toLowerCase())) {
      brandMentions++;
    }
    if (lowerUrl.includes(variant.toLowerCase())) {
      issues.push({
        type: 'url_contains_brand',
        severity: 'high',
        detail: `URL contains brand name variant: "${variant}"`,
      });
    }
  });

  // Assess threat level
  let threatLevel = 'low';
  if (issues.length > 0) {
    threatLevel = 'high';
  } else if (brandMentions > 3) {
    threatLevel = 'medium';
    issues.push({
      type: 'multiple_brand_mentions',
      severity: 'medium',
      detail: `Content contains ${brandMentions} brand mentions`,
    });
  }

  // Get AI analysis if content provided
  let aiAnalysis = null;
  if (content) {
    aiAnalysis = await scanWithGrokAPI(`URL: ${url}\n\nContent: ${content.substring(0, 500)}...`);
    if (aiAnalysis.threatLevel === 'high' && threatLevel !== 'high') {
      threatLevel = 'high';
    }
  }

  return {
    url,
    status: 'external',
    issues,
    threatLevel,
    brandMentions,
    aiAnalysis,
    timestamp: new Date().toISOString(),
    recommendations: generateRecommendations(issues, threatLevel),
  };
}

/**
 * Generate recommendations based on threat assessment
 * @private
 */
function generateRecommendations(issues, threatLevel) {
  const recommendations = [];

  if (threatLevel === 'high') {
    recommendations.push('Immediate review required');
    recommendations.push('Consider sending cease and desist notice');
    recommendations.push('Document all evidence');
    recommendations.push('Consult legal team if commercial use detected');
  } else if (threatLevel === 'medium') {
    recommendations.push('Monitor for escalation');
    recommendations.push('Reach out to owner for clarification');
    recommendations.push('Verify CLA compliance if GitHub fork');
  } else {
    recommendations.push('Continue routine monitoring');
    recommendations.push('No immediate action required');
  }

  if (issues.some(i => i.type === 'url_contains_brand')) {
    recommendations.push('Check domain registration details');
    recommendations.push('Verify if domain redirects to official site');
  }

  return recommendations;
}

/**
 * Generate brand monitoring report
 */
function generateMonitoringReport(scans) {
  const highThreats = scans.filter(s => s.threatLevel === 'high');
  const mediumThreats = scans.filter(s => s.threatLevel === 'medium');
  const lowThreats = scans.filter(s => s.threatLevel === 'low');

  return {
    summary: {
      total: scans.length,
      high: highThreats.length,
      medium: mediumThreats.length,
      low: lowThreats.length,
    },
    highPriority: highThreats.map(t => ({
      url: t.url,
      issues: t.issues,
      recommendations: t.recommendations,
    })),
    mediumPriority: mediumThreats.map(t => ({
      url: t.url,
      brandMentions: t.brandMentions,
    })),
    recommendations: [
      ...(highThreats.length > 0 ? ['Take immediate action on high-priority threats'] : []),
      ...(mediumThreats.length > 2 ? ['Increase monitoring frequency'] : []),
      'Continue routine brand surveillance',
      'Update Google Alerts if needed',
    ],
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Track brand mention from various sources
 */
async function trackBrandMention(source, url, context) {
  const mention = {
    id: `mention_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    source,
    url,
    context,
    timestamp: new Date().toISOString(),
    analyzed: false,
  };

  // Analyze the mention
  const analysis = await analyzeBrandUsage(url, context);
  mention.analysis = analysis;
  mention.analyzed = true;

  return mention;
}

/**
 * Get brand monitoring statistics
 */
function getBrandMonitoringStats() {
  return {
    brandName: BRAND_CONFIG.brandName,
    monitoredVariations: BRAND_CONFIG.brandVariations.length,
    officialDomains: BRAND_CONFIG.officialDomains.length,
    tools: [
      'Google Alerts (free)',
      'Grok API (AI-powered)',
      'GitHub Fork Scanner',
      'Manual Review',
    ],
    coverage: {
      webSearch: 'Google Alerts',
      socialMedia: 'Manual + Alerts',
      github: 'API Scanner',
      aiAnalysis: 'Grok API',
    },
  };
}

module.exports = {
  getGoogleAlertsGuide,
  scanWithGrokAPI,
  analyzeBrandUsage,
  generateMonitoringReport,
  trackBrandMention,
  getBrandMonitoringStats,
  BRAND_CONFIG,
};
