/**
 * AppWhistler - Background Service Worker
 * Handles background tasks, badge updates, and API communication
 */

// Listen for extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('[AppWhistler] Extension installed');

    // Open welcome page
    chrome.tabs.create({
      url: 'https://appwhistler.org/welcome?source=extension'
    });

    // Set default badge
    chrome.action.setBadgeText({ text: '' });
    chrome.action.setBadgeBackgroundColor({ color: '#3b82f6' });
  }

  if (details.reason === 'update') {
    console.log('[AppWhistler] Extension updated');

    // Clear old cache on major updates
    const oldVersion = details.previousVersion || '0.0.0';
    const newVersion = chrome.runtime.getManifest().version;

    if (isMajorUpdate(oldVersion, newVersion)) {
      chrome.storage.local.clear(() => {
        console.log('[AppWhistler] Cache cleared after major update');
      });
    }
  }
});

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'analyzeUrl') {
    // Content script requesting URL analysis
    handleAnalyzeRequest(request.url)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));

    return true; // Keep channel open for async response
  }

  if (request.action === 'updateBadge') {
    // Update extension badge with stats
    updateBadge(request.count);
    sendResponse({ success: true });
  }

  if (request.action === 'getStats') {
    // Get usage statistics
    getExtensionStats()
      .then(stats => sendResponse({ success: true, data: stats }))
      .catch(error => sendResponse({ success: false, error: error.message }));

    return true;
  }
});

/**
 * Handle URL analysis request
 */
async function handleAnalyzeRequest(url) {
  // Check cache first
  const cacheKey = `analysis_${url}`;
  const cached = await getFromStorage(cacheKey);

  if (cached && cached.expiry > Date.now()) {
    console.log('[AppWhistler] Returning cached analysis for:', url);
    return cached.value;
  }

  // Fetch from API
  console.log('[AppWhistler] Fetching fresh analysis for:', url);

  const apiUrl = 'https://api.appwhistler.org/graphql';
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
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query,
        variables: { url }
      })
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const result = await response.json();

    if (result.errors) {
      throw new Error(result.errors[0]?.message || 'GraphQL error');
    }

    const analysis = result.data.analyzeUrl;

    // Cache for 1 hour
    await saveToStorage(cacheKey, analysis, 60);

    // Update stats
    await incrementStat('totalAnalyses');

    return analysis;

  } catch (error) {
    console.error('[AppWhistler] API error:', error);

    // Return mock data on error
    return getMockAnalysis(url);
  }
}

/**
 * Update extension badge
 */
async function updateBadge(count) {
  if (!count || count === 0) {
    chrome.action.setBadgeText({ text: '' });
    return;
  }

  chrome.action.setBadgeText({ text: String(count) });
  chrome.action.setBadgeBackgroundColor({ color: '#10b981' });
}

/**
 * Get extension usage statistics
 */
async function getExtensionStats() {
  const stats = await getFromStorage('stats') || {
    totalAnalyses: 0,
    lastUsed: null,
    installedDate: Date.now()
  };

  return stats;
}

/**
 * Increment a stat counter
 */
async function incrementStat(key) {
  const stats = await getFromStorage('stats') || {
    totalAnalyses: 0,
    lastUsed: null,
    installedDate: Date.now()
  };

  stats[key] = (stats[key] || 0) + 1;
  stats.lastUsed = Date.now();

  await saveToStorage('stats', stats);
}

/**
 * Storage helpers
 */
function getFromStorage(key) {
  return new Promise((resolve) => {
    chrome.storage.local.get([key], (result) => {
      resolve(result[key]);
    });
  });
}

function saveToStorage(key, value, expiryMinutes = 0) {
  const item = expiryMinutes > 0
    ? { value, expiry: Date.now() + (expiryMinutes * 60 * 1000) }
    : value;

  return new Promise((resolve) => {
    chrome.storage.local.set({ [key]: item }, resolve);
  });
}

/**
 * Check if update is a major version bump
 */
function isMajorUpdate(oldVersion, newVersion) {
  const oldMajor = parseInt(oldVersion.split('.')[0]);
  const newMajor = parseInt(newVersion.split('.')[0]);
  return newMajor > oldMajor;
}

/**
 * Mock analysis for offline/error states
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
        category: 'System',
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
      summary: 'Full analysis pending. This is a preview.',
      strengths: ['Pending analysis'],
      concerns: ['Data not yet verified'],
      verificationStatus: 'PENDING'
    }
  };
}

console.log('[AppWhistler] Service worker initialized');
