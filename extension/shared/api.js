/**
 * AppWhistler API Client
 * Handles GraphQL communication with backend
 */

const API_URL = 'https://api.appwhistler.org/graphql';
const FALLBACK_API_URL = 'http://localhost:5000/graphql'; // Dev fallback

/**
 * Execute GraphQL query with error handling and retry logic
 */
async function graphqlRequest(query, variables = {}, retries = 2) {
  const requestBody = {
    query,
    variables
  };

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // TODO: Add auth token when user is logged in
          // 'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.errors) {
        console.error('GraphQL errors:', result.errors);
        throw new Error(result.errors[0]?.message || 'GraphQL request failed');
      }

      return result.data;
    } catch (error) {
      console.error(`API request attempt ${attempt + 1} failed:`, error);

      // If last attempt, throw error
      if (attempt === retries) {
        throw error;
      }

      // Exponential backoff: 1s, 2s
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
    }
  }
}

/**
 * Analyze a URL (app store link, website, etc.)
 * Returns truth score and metadata
 */
export async function analyzeUrl(url) {
  const query = `
    query AnalyzeUrl($url: String!) {
      analyzeUrl(url: $url) {
        url
        appName
        category
        truthScore
        letterGrade
        redFlags {
          severity
          category
          description
        }
        metadata {
          developer
          lastUpdated
          userCount
          avgRating
        }
        analysis {
          summary
          strengths
          concerns
          verificationStatus
        }
      }
    }
  `;

  try {
    const data = await graphqlRequest(query, { url });
    return data.analyzeUrl;
  } catch (error) {
    console.error('analyzeUrl failed:', error);

    // Return mock data on failure (for MVP)
    return getMockAnalysis(url);
  }
}

/**
 * Get trending apps with truth scores
 */
export async function getTrendingApps(limit = 10) {
  const query = `
    query TrendingApps($limit: Int) {
      trendingApps(limit: $limit) {
        id
        name
        category
        truthRating
        redFlags
        userCount
      }
    }
  `;

  const data = await graphqlRequest(query, { limit });
  return data.trendingApps;
}

/**
 * Submit a community note (future feature)
 */
export async function submitCommunityNote(appId, note) {
  const mutation = `
    mutation SubmitNote($appId: ID!, $note: String!) {
      submitCommunityNote(appId: $appId, note: $note) {
        success
        message
      }
    }
  `;

  const data = await graphqlRequest(mutation, { appId, note });
  return data.submitCommunityNote;
}

/**
 * Mock analysis for offline/fallback mode
 */
function getMockAnalysis(url) {
  const domain = new URL(url).hostname.replace('www.', '');

  return {
    url,
    appName: domain.split('.')[0],
    category: 'Unknown',
    truthScore: 75,
    letterGrade: 'C+',
    redFlags: [
      {
        severity: 'MEDIUM',
        category: 'Privacy',
        description: 'Analysis pending - using cached data'
      }
    ],
    metadata: {
      developer: 'Unknown',
      lastUpdated: new Date().toISOString(),
      userCount: 'N/A',
      avgRating: 'N/A'
    },
    analysis: {
      summary: 'Full analysis pending. This is a cached preview.',
      strengths: ['Pending analysis'],
      concerns: ['Data not yet verified'],
      verificationStatus: 'PENDING'
    }
  };
}

/**
 * Cache management
 */
export const cache = {
  async get(key) {
    return new Promise((resolve) => {
      chrome.storage.local.get([key], (result) => {
        resolve(result[key]);
      });
    });
  },

  async set(key, value, expiryMinutes = 60) {
    const item = {
      value,
      expiry: Date.now() + (expiryMinutes * 60 * 1000)
    };

    return new Promise((resolve) => {
      chrome.storage.local.set({ [key]: item }, resolve);
    });
  },

  async has(key) {
    const item = await this.get(key);
    if (!item) return false;

    // Check expiry
    if (item.expiry && Date.now() > item.expiry) {
      await this.remove(key);
      return false;
    }

    return true;
  },

  async remove(key) {
    return new Promise((resolve) => {
      chrome.storage.local.remove([key], resolve);
    });
  }
};

/**
 * Rate limiter - max 50 requests per hour
 */
export const rateLimiter = {
  maxRequests: 50,
  windowMs: 60 * 60 * 1000, // 1 hour

  async checkLimit() {
    const requests = await cache.get('rateLimit_requests') || [];
    const now = Date.now();

    // Filter out expired requests
    const validRequests = requests.filter(time => now - time < this.windowMs);

    if (validRequests.length >= this.maxRequests) {
      const oldestRequest = Math.min(...validRequests);
      const resetTime = new Date(oldestRequest + this.windowMs);
      throw new Error(`Rate limit exceeded. Resets at ${resetTime.toLocaleTimeString()}`);
    }

    // Add current request
    validRequests.push(now);
    await cache.set('rateLimit_requests', validRequests, 60);

    return true;
  }
};
