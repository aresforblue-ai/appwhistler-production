# AppWhistler Chrome Extension

> Instant truth ratings for any app mentioned on X/Twitter. See verified scores, red flags, and community notes without leaving your timeline.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

---

## 🎺 What is AppWhistler?

AppWhistler automatically scans X/Twitter for app links and adds a "Truth Check" button to tweets. Click it to see:

- **Truth Score (A-F)**: Community-verified rating based on privacy, security, and transparency
- **Red Flags**: Privacy concerns, security issues, and misleading claims
- **Developer Info**: Who built it, user count, last updated
- **Verification Status**: Whether the app has been verified by the AppWhistler community

---

## ✨ Features

### 🔍 Automatic Detection
Detects app links from:
- Apple App Store
- Google Play Store
- Chrome Web Store
- Firefox Add-ons
- Microsoft Store
- Popular app websites (Facebook, Instagram, TikTok, etc.)

### 🎨 Beautiful UI
- **Glassmorphism design** with dark mode auto-detection
- **Floating truth panel** with comprehensive analysis
- **Letter grades (A-F)** with color-coded scoring
- **Red flag warnings** for privacy/security concerns

### ⚡ Performance
- **Rate limiting**: Max 50 requests/hour to protect API
- **Smart caching**: Last 50 analyses cached locally (1 hour TTL)
- **Lazy loading**: Only analyzes apps when you click the button
- **Offline support**: Shows cached data when API is unavailable

### 🔒 Privacy-First
- **No tracking**: Extension doesn't collect any personal data
- **No ads**: 100% free, no monetization
- **Open source**: Code is publicly auditable

---

## 📦 Installation

### From Chrome Web Store (Recommended)

1. Visit [Chrome Web Store - AppWhistler](https://chrome.google.com/webstore) *(coming soon)*
2. Click "Add to Chrome"
3. Confirm permissions
4. Start browsing X/Twitter!

### Manual Installation (Developer Mode)

1. **Clone the repository**:
   ```bash
   git clone https://github.com/appwhistler/extension.git
   cd extension/chrome
   ```

2. **Open Chrome Extensions**:
   - Navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)

3. **Load extension**:
   - Click "Load unpacked"
   - Select the `extension/chrome` folder
   - Extension icon (🎺) will appear in toolbar

4. **Visit X/Twitter**:
   - Go to https://x.com or https://twitter.com
   - Scroll through your timeline
   - Look for tweets with app links
   - Click the "🎺 Truth Check" button

---

## 🚀 Usage

### Basic Usage

1. **Browse X/Twitter** normally
2. Extension automatically detects tweets with app links
3. **Click the "🎺 Truth Check" button** next to the tweet actions
4. See the floating truth panel with full analysis

### Understanding Truth Scores

| Grade | Score | Meaning |
|-------|-------|---------|
| A+ | 95-100 | Excellent - Highly trustworthy |
| A | 90-94 | Excellent - Very trustworthy |
| B+ | 85-89 | Good - Generally trustworthy |
| B | 80-84 | Good - Mostly trustworthy |
| C+ | 75-79 | Fair - Some concerns |
| C | 70-74 | Fair - Multiple concerns |
| D+ | 65-69 | Poor - Significant issues |
| D | 60-64 | Poor - Many red flags |
| F | <60 | Critical - Avoid this app |

### Red Flag Severity

- **🔴 Critical**: Major security/privacy issues
- **🟠 High**: Serious concerns that need attention
- **🟡 Medium**: Moderate issues to be aware of
- **🔵 Low**: Minor concerns or missing data

---

## 🛠️ Development

### Project Structure

```
extension/
├── chrome/                    # Chrome extension
│   ├── manifest.json         # Extension config (Manifest v3)
│   ├── content/
│   │   ├── injectWhistleButton.js    # Tweet detection & button injection
│   │   ├── overlayTruthPanel.js      # Floating truth panel UI
│   │   └── styles.css                # Extension styles (dark mode support)
│   ├── background/
│   │   └── serviceWorker.js          # Background service worker
│   ├── popup/
│   │   ├── popup.html                # Extension popup UI
│   │   └── popup.js                  # Popup logic
│   └── assets/
│       └── whistle-*.png             # Extension icons
└── shared/
    └── api.js                         # GraphQL API client
```

### Local Development

1. **Make changes** to any extension files
2. **Reload extension**:
   - Go to `chrome://extensions/`
   - Click the reload icon on the AppWhistler extension
3. **Refresh X/Twitter** tab to see changes

### Testing

```bash
# Test API connection
curl https://api.appwhistler.org/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "query { analyzeUrl(url: \"https://twitter.com\") { truthScore } }"}'

# Expected response:
# {"data":{"analyzeUrl":{"truthScore":75}}}
```

### Building for Production

```bash
# Zip extension for Chrome Web Store submission
cd extension/chrome
zip -r appwhistler-extension-v1.0.0.zip . -x "*.git*" "*.DS_Store"
```

---

## 🔧 Configuration

### API Endpoint

The extension connects to the AppWhistler GraphQL API. To change the API URL:

**Edit `extension/shared/api.js`**:
```javascript
const API_URL = 'https://api.appwhistler.org/graphql';
const FALLBACK_API_URL = 'http://localhost:5000/graphql'; // Local dev
```

### Rate Limiting

Default: 50 requests per hour per user.

To change, edit `extension/shared/api.js`:
```javascript
export const rateLimiter = {
  maxRequests: 50,        // Change this
  windowMs: 60 * 60 * 1000, // 1 hour
};
```

### Cache Duration

Default: 1 hour TTL for cached analyses.

To change, edit `extension/shared/api.js`:
```javascript
await cache.set(cacheKey, analysis, 60); // Change 60 to desired minutes
```

---

## 🔐 Permissions

The extension requests these permissions:

| Permission | Reason |
|------------|--------|
| `storage` | Cache analyses locally for performance |
| `activeTab` | Read current X/Twitter tab to detect app links |
| `https://twitter.com/*` | Inject truth check buttons on Twitter |
| `https://x.com/*` | Inject truth check buttons on X |
| `https://api.appwhistler.org/*` | Fetch truth ratings from API |

**We do NOT request**:
- ❌ Access to other websites
- ❌ Read/modify browsing history
- ❌ Access to bookmarks or downloads
- ❌ Location data

---

## 🐛 Troubleshooting

### Extension Not Working

1. **Reload extension**:
   - Go to `chrome://extensions/`
   - Click reload icon on AppWhistler

2. **Refresh X/Twitter tab**:
   - Press `Ctrl+R` (Windows) or `Cmd+R` (Mac)

3. **Check console for errors**:
   - Press `F12` to open DevTools
   - Look for errors in Console tab
   - Look for failed requests in Network tab

### Whistle Button Not Appearing

1. **Verify you're on X/Twitter**: Extension only works on `twitter.com` or `x.com`
2. **Check for app links**: Button only appears on tweets with app links
3. **Supported app links**:
   - `apps.apple.com/*/app/*`
   - `play.google.com/store/apps/*`
   - `chrome.google.com/webstore/*`
   - Popular apps (Facebook, Instagram, TikTok, etc.)

### Truth Panel Won't Load

1. **Check internet connection**: Extension needs API access
2. **Verify API is online**: Visit https://api.appwhistler.org/health
3. **Check rate limit**: Wait if you've exceeded 50 requests/hour
4. **Clear cache**:
   - Click extension icon
   - Click "Clear Cache"

### Dark Mode Issues

The extension auto-detects dark mode from:
1. System preferences (`prefers-color-scheme: dark`)
2. X/Twitter's theme setting

If dark mode isn't working:
1. Check your system dark mode settings
2. Check X/Twitter's appearance settings
3. Refresh the page

---

## 📝 Contributing

We welcome contributions! Here's how:

### Reporting Bugs

1. Go to [GitHub Issues](https://github.com/appwhistler/extension/issues)
2. Click "New Issue"
3. Include:
   - Browser version
   - Extension version
   - Steps to reproduce
   - Screenshots (if applicable)

### Suggesting Features

1. Open a [GitHub Discussion](https://github.com/appwhistler/extension/discussions)
2. Describe the feature and why it's useful
3. Include mockups if applicable

### Submitting Pull Requests

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Test thoroughly
5. Commit: `git commit -m "Add amazing feature"`
6. Push: `git push origin feature/amazing-feature`
7. Open a Pull Request

---

## 📜 License

MIT License - see [LICENSE](../LICENSE) for details.

---

## 🔗 Links

- **Website**: https://appwhistler.org
- **API Documentation**: https://api.appwhistler.org/docs
- **GitHub**: https://github.com/appwhistler/extension
- **Twitter**: https://twitter.com/appwhistler *(coming soon)*
- **Discord**: https://discord.gg/appwhistler *(coming soon)*

---

## 💖 Support

If you find AppWhistler useful:

- ⭐ **Star the repository** on GitHub
- 🐦 **Share on X/Twitter** with #AppWhistler
- 🎺 **Leave a review** on Chrome Web Store
- 💬 **Join the community** on Discord

---

## ❓ FAQ

### Is AppWhistler free?

Yes, 100% free. No ads, no tracking, no premium tiers.

### How do you make money?

We don't (yet). This is an open-source community project.

### Can I use this on Firefox/Safari?

Firefox support coming soon! Safari version in planning.

### Who verifies the truth scores?

Scores are based on:
1. **Community fact-checks** from verified users
2. **Automated analysis** of privacy policies and permissions
3. **Third-party security audits** when available

### How often are scores updated?

Scores are recalculated when:
- New community fact-checks are submitted
- App updates are detected
- Security vulnerabilities are reported

### Can I submit corrections?

Yes! Click "Add Community Note" in the truth panel (coming soon).

### Is my data private?

Absolutely. The extension:
- ❌ Does NOT track which apps you check
- ❌ Does NOT log your browsing history
- ❌ Does NOT share data with third parties
- ✅ Only sends the app URL to our API (no personal data)

---

**Made with 🎺 and truth by the AppWhistler Team**

*Last updated: 2025-11-23*
