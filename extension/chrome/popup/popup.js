/**
 * AppWhistler Extension Popup Script
 */

// Load statistics on popup open
document.addEventListener('DOMContentLoaded', async () => {
  await loadStats();
  setupEventListeners();
});

/**
 * Load usage statistics from storage
 */
async function loadStats() {
  try {
    const result = await chrome.storage.local.get(['stats']);
    const stats = result.stats || {
      totalAnalyses: 0,
      lastUsed: null,
      installedDate: Date.now()
    };

    // Update UI
    document.getElementById('totalAnalyses').textContent = stats.totalAnalyses || 0;

    if (stats.lastUsed) {
      const lastUsedDate = new Date(stats.lastUsed);
      const now = new Date();
      const diffMs = now - lastUsedDate;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      let lastUsedText;
      if (diffMins < 1) {
        lastUsedText = 'Just now';
      } else if (diffMins < 60) {
        lastUsedText = `${diffMins}m ago`;
      } else if (diffHours < 24) {
        lastUsedText = `${diffHours}h ago`;
      } else {
        lastUsedText = `${diffDays}d ago`;
      }

      document.getElementById('lastUsed').textContent = lastUsedText;
    } else {
      document.getElementById('lastUsed').textContent = 'Never';
    }

  } catch (error) {
    console.error('Failed to load stats:', error);
  }
}

/**
 * Setup button event listeners
 */
function setupEventListeners() {
  // View History button
  document.getElementById('viewHistory').addEventListener('click', () => {
    chrome.tabs.create({
      url: 'https://appwhistler.org/dashboard?source=extension'
    });
  });

  // Clear Cache button
  document.getElementById('clearCache').addEventListener('click', async () => {
    if (confirm('Clear all cached analyses? This will not affect your account data.')) {
      try {
        // Clear all storage except stats
        const stats = (await chrome.storage.local.get(['stats'])).stats;

        await chrome.storage.local.clear();

        // Restore stats
        if (stats) {
          await chrome.storage.local.set({ stats });
        }

        alert('Cache cleared successfully!');
        window.close();
      } catch (error) {
        console.error('Failed to clear cache:', error);
        alert('Failed to clear cache. Please try again.');
      }
    }
  });
}
