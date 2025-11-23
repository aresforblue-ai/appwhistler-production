/**
 * AppWhistler - Floating Truth Panel
 * Displays comprehensive truth analysis for detected apps
 */

let currentPanel = null;

/**
 * Listen for panel display requests
 */
document.addEventListener('appwhistler:showPanel', (event) => {
  const { tweet, analysis } = event.detail;
  showPanel(tweet, analysis);
});

/**
 * Create and display truth panel
 */
function showPanel(tweetElement, analysis) {
  // Remove existing panel
  if (currentPanel) {
    currentPanel.remove();
  }

  // Create panel container
  const panel = createPanelElement(analysis);

  // Position near tweet
  positionPanel(panel, tweetElement);

  // Add to DOM
  document.body.appendChild(panel);
  currentPanel = panel;

  // Animate in
  setTimeout(() => panel.classList.add('visible'), 10);

  // Auto-hide after 10 seconds (user can pin it)
  const autoHideTimer = setTimeout(() => {
    if (!panel.classList.contains('pinned')) {
      hidePanel();
    }
  }, 10000);

  // Clear timer if user pins
  panel.addEventListener('click', (e) => {
    if (e.target.closest('.pin-button')) {
      clearTimeout(autoHideTimer);
      panel.classList.toggle('pinned');
    }
  });
}

/**
 * Create panel HTML element
 */
function createPanelElement(analysis) {
  const panel = document.createElement('div');
  panel.className = 'appwhistler-panel';
  panel.innerHTML = `
    <div class="panel-header">
      <div class="panel-title">
        <span class="whistle-logo">🎺</span>
        <span class="app-name">${escapeHtml(analysis.appName)}</span>
      </div>
      <div class="panel-actions">
        <button class="pin-button" title="Pin panel">📌</button>
        <button class="close-button" title="Close">✕</button>
      </div>
    </div>

    <div class="panel-body">
      <!-- Truth Score -->
      <div class="truth-score">
        <div class="grade-circle grade-${getGradeClass(analysis.letterGrade)}">
          <span class="grade-letter">${analysis.letterGrade}</span>
          <span class="grade-label">Truth Score</span>
        </div>
        <div class="score-details">
          <div class="score-number">${analysis.truthScore}/100</div>
          <div class="score-description">${getScoreDescription(analysis.truthScore)}</div>
        </div>
      </div>

      <!-- Red Flags -->
      ${analysis.redFlags && analysis.redFlags.length > 0 ? `
        <div class="red-flags">
          <h3 class="section-title">⚠️ Red Flags</h3>
          <div class="flags-list">
            ${analysis.redFlags.map(flag => `
              <div class="flag-item severity-${flag.severity.toLowerCase()}">
                <span class="flag-category">${flag.category}</span>
                <span class="flag-description">${escapeHtml(flag.description)}</span>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <!-- Analysis Summary -->
      ${analysis.analysis ? `
        <div class="analysis-summary">
          <h3 class="section-title">📊 Analysis</h3>
          <p class="summary-text">${escapeHtml(analysis.analysis.summary)}</p>

          ${analysis.analysis.strengths && analysis.analysis.strengths.length > 0 ? `
            <div class="strengths">
              <h4>✅ Strengths</h4>
              <ul>
                ${analysis.analysis.strengths.map(s => `<li>${escapeHtml(s)}</li>`).join('')}
              </ul>
            </div>
          ` : ''}

          ${analysis.analysis.concerns && analysis.analysis.concerns.length > 0 ? `
            <div class="concerns">
              <h4>❌ Concerns</h4>
              <ul>
                ${analysis.analysis.concerns.map(c => `<li>${escapeHtml(c)}</li>`).join('')}
              </ul>
            </div>
          ` : ''}
        </div>
      ` : ''}

      <!-- Metadata -->
      ${analysis.metadata ? `
        <div class="metadata">
          <div class="meta-item">
            <span class="meta-label">Developer</span>
            <span class="meta-value">${escapeHtml(analysis.metadata.developer || 'Unknown')}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Category</span>
            <span class="meta-value">${escapeHtml(analysis.category || 'Unknown')}</span>
          </div>
          ${analysis.metadata.userCount ? `
            <div class="meta-item">
              <span class="meta-label">Users</span>
              <span class="meta-value">${analysis.metadata.userCount}</span>
            </div>
          ` : ''}
        </div>
      ` : ''}

      <!-- Actions -->
      <div class="panel-footer">
        <button class="action-btn primary" data-action="view-full">
          View Full Report
        </button>
        <button class="action-btn secondary" data-action="community-note">
          Add Community Note
        </button>
      </div>
    </div>
  `;

  // Add event listeners
  panel.querySelector('.close-button').addEventListener('click', hidePanel);

  panel.querySelector('[data-action="view-full"]').addEventListener('click', () => {
    window.open(`https://appwhistler.org/app/${encodeURIComponent(analysis.url)}`, '_blank');
  });

  panel.querySelector('[data-action="community-note"]').addEventListener('click', () => {
    // TODO: Implement community note submission
    alert('Community notes coming soon! Help us verify app claims.');
  });

  return panel;
}

/**
 * Position panel near tweet (floating)
 */
function positionPanel(panel, tweetElement) {
  const rect = tweetElement.getBoundingClientRect();

  // Position to the right of the tweet if space available
  const spaceRight = window.innerWidth - rect.right;
  const panelWidth = 400;

  if (spaceRight > panelWidth + 20) {
    // Float to the right
    panel.style.position = 'fixed';
    panel.style.left = `${rect.right + 20}px`;
    panel.style.top = `${Math.max(rect.top, 80)}px`; // Below header
  } else {
    // Overlay on top of tweet (centered)
    panel.style.position = 'fixed';
    panel.style.left = '50%';
    panel.style.top = '50%';
    panel.style.transform = 'translate(-50%, -50%)';
    panel.classList.add('centered');
  }

  // Ensure panel doesn't go off-screen
  panel.style.maxHeight = `${window.innerHeight - 100}px`;
}

/**
 * Hide current panel
 */
function hidePanel() {
  if (currentPanel) {
    currentPanel.classList.remove('visible');
    setTimeout(() => {
      currentPanel.remove();
      currentPanel = null;
    }, 300);
  }
}

/**
 * Get CSS class for letter grade
 */
function getGradeClass(grade) {
  const base = grade.replace('+', '-plus').replace('-', '-minus').toLowerCase();
  return base;
}

/**
 * Get human-readable score description
 */
function getScoreDescription(score) {
  if (score >= 90) return 'Excellent - Highly Trustworthy';
  if (score >= 80) return 'Good - Generally Trustworthy';
  if (score >= 70) return 'Fair - Some Concerns';
  if (score >= 60) return 'Poor - Multiple Red Flags';
  return 'Critical - Avoid This App';
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Close panel when clicking outside
 */
document.addEventListener('click', (e) => {
  if (currentPanel && !currentPanel.contains(e.target) && !e.target.closest('.appwhistler-button')) {
    if (!currentPanel.classList.contains('pinned')) {
      hidePanel();
    }
  }
});

/**
 * Close panel on Escape key
 */
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && currentPanel) {
    hidePanel();
  }
});
