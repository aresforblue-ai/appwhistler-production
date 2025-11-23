/**
 * AppWhistler - Tweet Detection & Whistle Button Injection
 * Scans X/Twitter timeline for app links and adds truth rating buttons
 */

import { analyzeUrl, cache, rateLimiter } from '../shared/api.js';

// App link patterns (App Store, Google Play, websites, etc.)
const APP_LINK_PATTERNS = [
  /apps\.apple\.com\/.*\/app\//i,
  /play\.google\.com\/store\/apps/i,
  /chrome\.google\.com\/webstore/i,
  /addons\.mozilla\.org/i,
  /microsoftedge\.microsoft\.com/i,
  /apps\.microsoft\.com/i,
  /(?:https?:\/\/)?(?:www\.)?(facebook|instagram|tiktok|snapchat|twitter|x\.com)(?:\.com)?/i
];

// Mutation observer to detect new tweets
let observer = null;
const processedTweets = new WeakSet();

/**
 * Initialize the extension on page load
 */
function init() {
  console.log('[AppWhistler] Extension loaded on X/Twitter');

  // Scan existing tweets
  scanForTweets();

  // Watch for new tweets (infinite scroll)
  setupMutationObserver();

  // Periodic re-scan (backup for missed tweets)
  setInterval(scanForTweets, 3000);
}

/**
 * Scan DOM for tweets with app links
 */
function scanForTweets() {
  // X/Twitter uses article elements for tweets
  const tweets = document.querySelectorAll('article[data-testid="tweet"]');

  tweets.forEach(tweet => {
    if (processedTweets.has(tweet)) return;

    const links = extractAppLinks(tweet);
    if (links.length > 0) {
      injectWhistleButton(tweet, links);
      processedTweets.add(tweet);
    }
  });
}

/**
 * Extract app-related links from a tweet
 */
function extractAppLinks(tweet) {
  const links = tweet.querySelectorAll('a[href]');
  const appLinks = [];

  links.forEach(link => {
    const href = link.href;

    // Check if link matches app patterns
    const isAppLink = APP_LINK_PATTERNS.some(pattern => pattern.test(href));

    if (isAppLink) {
      appLinks.push({
        url: href,
        text: link.textContent.trim(),
        element: link
      });
    }
  });

  return appLinks;
}

/**
 * Inject whistle button next to tweet actions
 */
function injectWhistleButton(tweet, appLinks) {
  // Find tweet actions bar (like, retweet, reply buttons)
  const actionsBar = tweet.querySelector('[role="group"]');
  if (!actionsBar) return;

  // Check if button already exists
  if (tweet.querySelector('.appwhistler-button')) return;

  // Create whistle button
  const button = document.createElement('div');
  button.className = 'appwhistler-button';
  button.innerHTML = `
    <button class="appwhistler-btn" title="Check App Truth Score">
      <span class="whistle-icon">🎺</span>
      <span class="whistle-text">Truth Check</span>
    </button>
  `;

  // Add click handler
  button.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();

    await handleWhistleClick(tweet, appLinks[0]); // Use first app link for now
  });

  // Insert button into actions bar
  actionsBar.appendChild(button);
}

/**
 * Handle whistle button click - show truth panel
 */
async function handleWhistleClick(tweet, appLink) {
  const button = tweet.querySelector('.appwhistler-btn');
  if (!button) return;

  // Show loading state
  button.classList.add('loading');
  button.innerHTML = `
    <span class="whistle-icon">⏳</span>
    <span class="whistle-text">Analyzing...</span>
  `;

  try {
    // Check rate limit
    await rateLimiter.checkLimit();

    // Check cache first
    const cacheKey = `analysis_${appLink.url}`;
    let analysis = await cache.get(cacheKey);

    if (!analysis || !analysis.value) {
      // Fetch fresh analysis
      analysis = await analyzeUrl(appLink.url);

      // Cache for 1 hour
      await cache.set(cacheKey, analysis, 60);
    } else {
      analysis = analysis.value;
    }

    // Show truth panel
    showTruthPanel(tweet, analysis);

    // Update button to show score
    button.classList.remove('loading');
    button.classList.add('analyzed');
    button.innerHTML = `
      <span class="whistle-icon">🎺</span>
      <span class="whistle-text grade-${analysis.letterGrade.toLowerCase().replace('+', 'plus').replace('-', 'minus')}">
        ${analysis.letterGrade}
      </span>
    `;

  } catch (error) {
    console.error('[AppWhistler] Analysis failed:', error);

    // Show error state
    button.classList.remove('loading');
    button.classList.add('error');
    button.innerHTML = `
      <span class="whistle-icon">⚠️</span>
      <span class="whistle-text">Error</span>
    `;

    // Show error message
    alert(`AppWhistler Error: ${error.message}`);
  }
}

/**
 * Show floating truth panel with analysis
 */
function showTruthPanel(tweet, analysis) {
  // Remove any existing panels
  document.querySelectorAll('.appwhistler-panel').forEach(p => p.remove());

  // Create panel (overlayTruthPanel.js will handle this)
  const event = new CustomEvent('appwhistler:showPanel', {
    detail: { tweet, analysis }
  });
  document.dispatchEvent(event);
}

/**
 * Setup mutation observer for infinite scroll
 */
function setupMutationObserver() {
  if (observer) return;

  observer = new MutationObserver((mutations) => {
    // Debounce - only scan after mutations settle
    clearTimeout(observer.timeout);
    observer.timeout = setTimeout(scanForTweets, 500);
  });

  // Observe timeline container
  const timeline = document.querySelector('[data-testid="primaryColumn"]') || document.body;

  observer.observe(timeline, {
    childList: true,
    subtree: true
  });
}

/**
 * Cleanup on page unload
 */
window.addEventListener('beforeunload', () => {
  if (observer) {
    observer.disconnect();
  }
});

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
