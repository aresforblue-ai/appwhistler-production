// src/ai/grokIntegration.js
// xAI Grok API integration for AI-powered recommendations and fact-checking

const axios = require('axios');

/**
 * Grok API Client for AppWhistler
 * Handles app recommendations, fact-checking, and AI analysis
 */
class GrokClient {
  constructor() {
    this.apiKey = process.env.GROK_API_KEY;
    this.apiUrl = process.env.GROK_API_URL || 'https://api.x.ai/v1';
    this.model = 'grok-beta'; // Update based on xAI docs
    
    if (!this.apiKey) {
      console.warn('⚠️  GROK_API_KEY not set. AI features will be limited.');
    }
  }

  /**
   * Make request to Grok API
   * @private
   */
  async _request(endpoint, data, method = 'POST') {
    try {
      const response = await axios({
        method,
        url: `${this.apiUrl}${endpoint}`,
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        data,
        timeout: 30000 // 30 second timeout
      });

      return response.data;
    } catch (error) {
      console.error('Grok API error:', error.response?.data || error.message);
      throw new Error(`Grok API failed: ${error.message}`);
    }
  }

  /**
   * Generate app recommendations based on user preferences
   * @param {object} userProfile - User data (interests, history, etc.)
   * @param {array} availableApps - List of apps to consider
   * @returns {array} Ranked app recommendations with scores
   */
  async generateAppRecommendations(userProfile, availableApps) {
    const prompt = `
You are an expert app recommender for AppWhistler, a truth-tech platform.

USER PROFILE:
- Interests: ${userProfile.interests?.join(', ') || 'general'}
- Previously liked apps: ${userProfile.likedApps?.join(', ') || 'none'}
- Privacy consciousness: ${userProfile.privacyLevel || 'medium'}
- Preferred categories: ${userProfile.categories?.join(', ') || 'all'}

AVAILABLE APPS:
${availableApps.map(app => `
- ${app.name} (${app.category}): ${app.description}
  Privacy Score: ${app.privacyScore}/5, Security: ${app.securityScore}/5
`).join('\n')}

TASK: Rank the top 10 apps most suitable for this user. Consider:
1. Alignment with interests
2. Privacy/security scores (higher is better)
3. Category preferences
4. App quality and trustworthiness

OUTPUT FORMAT (JSON only):
{
  "recommendations": [
    {
      "appId": "app-uuid-here",
      "score": 0.95,
      "reason": "Brief explanation why this matches user"
    }
  ]
}
`;

    try {
      const response = await this._request('/chat/completions', {
        model: this.model,
        messages: [
          { role: 'system', content: 'You are a helpful app recommendation assistant. Always respond with valid JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 1500
      });

      // Parse Grok's response
      const content = response.choices[0].message.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        throw new Error('Failed to parse Grok response');
      }

      const result = JSON.parse(jsonMatch[0]);
      return result.recommendations;

    } catch (error) {
      console.error('Failed to generate recommendations:', error);
      // Fallback to simple scoring if AI fails
      return this._fallbackRecommendations(userProfile, availableApps);
    }
  }

  /**
   * Fact-check a claim using Grok's AI capabilities
   * @param {string} claim - The claim to verify
   * @param {string} category - Category (news, finance, health, etc.)
   * @returns {object} Fact-check result with verdict and sources
   */
  async factCheckClaim(claim, category = 'general') {
    const prompt = `
You are a fact-checking AI for AppWhistler, a truth verification platform.

CLAIM: "${claim}"
CATEGORY: ${category}

TASK: Analyze this claim and provide a fact-check verdict.

INSTRUCTIONS:
1. Determine if the claim is: TRUE, FALSE, MISLEADING, or UNVERIFIED
2. Provide confidence score (0.0 to 1.0)
3. List credible sources that support your verdict
4. Give a brief explanation (2-3 sentences)

OUTPUT FORMAT (JSON only):
{
  "verdict": "TRUE|FALSE|MISLEADING|UNVERIFIED",
  "confidence": 0.85,
  "sources": [
    {"url": "https://example.com/source1", "title": "Source Title"},
    {"url": "https://example.com/source2", "title": "Another Source"}
  ],
  "explanation": "Clear explanation of why the verdict was reached."
}

IMPORTANT: Base your verdict on verifiable facts, not opinions. If insufficient evidence, mark as UNVERIFIED.
`;

    try {
      const response = await this._request('/chat/completions', {
        model: this.model,
        messages: [
          { 
            role: 'system', 
            content: 'You are an expert fact-checker. Always provide evidence-based verdicts with credible sources. Respond with valid JSON only.' 
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3, // Lower temperature for factual responses
        max_tokens: 1000
      });

      const content = response.choices[0].message.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        throw new Error('Failed to parse fact-check response');
      }

      return JSON.parse(jsonMatch[0]);

    } catch (error) {
      console.error('Fact-check failed:', error);
      return {
        verdict: 'UNVERIFIED',
        confidence: 0,
        sources: [],
        explanation: 'Unable to verify claim due to AI service error.'
      };
    }
  }

  /**
   * Analyze image for misinformation (requires vision model)
   * @param {string} imageUrl - URL of image to analyze
   * @param {string} context - Optional context about the image
   * @returns {object} Analysis with verdict
   */
  async verifyImage(imageUrl, context = '') {
    const prompt = `
You are analyzing an image for potential misinformation.

IMAGE URL: ${imageUrl}
CONTEXT: ${context}

TASK: Determine if this image shows signs of:
1. Deep fake or AI generation
2. Manipulation/editing
3. Misrepresentation (image used out of context)

OUTPUT FORMAT (JSON only):
{
  "isAuthentic": true/false,
  "confidence": 0.75,
  "flags": ["deepfake", "edited", "out-of-context"],
  "explanation": "Description of findings"
}
`;

    try {
      // Note: This assumes Grok supports vision capabilities
      // Adjust based on actual API documentation
      const response = await this._request('/chat/completions', {
        model: 'grok-vision', // Hypothetical vision model
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: imageUrl } }
            ]
          }
        ],
        temperature: 0.2,
        max_tokens: 800
      });

      const content = response.choices[0].message.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      return JSON.parse(jsonMatch[0]);

    } catch (error) {
      console.error('Image verification failed:', error);
      return {
        isAuthentic: null,
        confidence: 0,
        flags: [],
        explanation: 'Unable to verify image - AI vision service unavailable.'
      };
    }
  }

  /**
   * Generate truth score for an app based on multiple factors
   * @param {object} appData - App information
   * @returns {number} Truth score (0-5)
   */
  async calculateTruthScore(appData) {
    const prompt = `
Analyze this app and calculate a Truth Score (0-5 scale):

APP: ${appData.name}
DEVELOPER: ${appData.developer}
CATEGORY: ${appData.category}
DESCRIPTION: ${appData.description}
PRIVACY POLICY: ${appData.privacyPolicyUrl || 'Not provided'}
PERMISSIONS: ${appData.permissions?.join(', ') || 'Unknown'}
USER REVIEWS: ${appData.avgRating || 'N/A'} (${appData.reviewCount || 0} reviews)

EVALUATION CRITERIA:
1. Transparency (clear privacy policy, known developer)
2. Security practices (minimal permissions, encryption)
3. User trust (ratings, reviews)
4. Data handling (what data is collected and why)
5. Reputation (developer history, controversies)

OUTPUT (JSON only):
{
  "truthScore": 4.2,
  "breakdown": {
    "transparency": 0.9,
    "security": 0.85,
    "userTrust": 0.8,
    "dataHandling": 0.9,
    "reputation": 0.85
  },
  "concerns": ["List any red flags or concerns"],
  "positives": ["List positive aspects"]
}
`;

    try {
      const response = await this._request('/chat/completions', {
        model: this.model,
        messages: [
          { 
            role: 'system', 
            content: 'You are a cybersecurity and privacy expert. Evaluate apps objectively.' 
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.4,
        max_tokens: 1000
      });

      const content = response.choices[0].message.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const result = JSON.parse(jsonMatch[0]);
      
      return result.truthScore;

    } catch (error) {
      console.error('Truth score calculation failed:', error);
      // Fallback to basic calculation
      return this._calculateBasicTruthScore(appData);
    }
  }

  /**
   * Fallback recommendation algorithm (no AI)
   * @private
   */
  _fallbackRecommendations(userProfile, availableApps) {
    return availableApps
      .map(app => ({
        appId: app.id,
        score: (app.privacyScore + app.securityScore) / 10,
        reason: 'Based on privacy and security scores'
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }

  /**
   * Basic truth score calculation (no AI)
   * @private
   */
  _calculateBasicTruthScore(appData) {
    let score = 2.5; // Start at middle

    // Boost for good ratings
    if (appData.avgRating >= 4.5) score += 0.5;
    else if (appData.avgRating >= 4.0) score += 0.3;

    // Boost for privacy/security
    if (appData.privacyScore >= 4) score += 0.5;
    if (appData.securityScore >= 4) score += 0.5;

    // Penalty for missing info
    if (!appData.privacyPolicyUrl) score -= 0.5;
    if (!appData.developer) score -= 0.3;

    return Math.max(0, Math.min(5, score)); // Clamp to 0-5
  }
}

// Singleton instance
const grokClient = new GrokClient();

module.exports = grokClient;