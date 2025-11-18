// src/scraper/ethicalScraper.js
// Ethical web scraper for app data collection (respects robots.txt and rate limits)

const puppeteer = require('puppeteer');
const axios = require('axios');
const robotsParser = require('robots-parser');
const { Pool } = require('pg');

/**
 * Ethical web scraper for AppWhistler
 * ALWAYS respects robots.txt, implements rate limiting, and identifies itself
 */
class EthicalScraper {
  constructor(pool) {
    this.pool = pool; // Database connection
    this.browser = null;
    this.robotsCache = new Map(); // Cache robots.txt rules
    
    // Rate limiting: Max requests per domain
    this.requestQueue = new Map();
    this.rateLimit = parseInt(process.env.SCRAPER_RATE_LIMIT_MS) || 2000; // 2 seconds between requests
    
    this.userAgent = process.env.SCRAPER_USER_AGENT || 
      'AppWhistlerBot/1.0 (+https://appwhistler.org/bot)';
  }

  /**
   * Initialize browser instance
   */
  async init() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: 'new', // Use new headless mode
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage'
        ]
      });
      console.log('🤖 Scraper browser initialized');
    }
  }

  /**
   * Close browser instance
   */
  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      console.log('🤖 Scraper browser closed');
    }
  }

  /**
   * Check if URL is allowed by robots.txt
   * @param {string} url - URL to check
   * @returns {boolean} True if allowed
   */
  async isAllowedByRobots(url) {
    try {
      const urlObj = new URL(url);
      const robotsUrl = `${urlObj.protocol}//${urlObj.host}/robots.txt`;

      // Check cache first
      if (this.robotsCache.has(urlObj.host)) {
        const robots = this.robotsCache.get(urlObj.host);
        return robots.isAllowed(url, this.userAgent);
      }

      // Fetch robots.txt
      const response = await axios.get(robotsUrl, {
        timeout: 5000,
        validateStatus: (status) => status === 200 || status === 404
      });

      if (response.status === 404) {
        // No robots.txt = everything allowed
        this.robotsCache.set(urlObj.host, {
          isAllowed: () => true
        });
        return true;
      }

      // Parse robots.txt
      const robots = robotsParser(robotsUrl, response.data);
      this.robotsCache.set(urlObj.host, robots);

      const allowed = robots.isAllowed(url, this.userAgent);
      
      if (!allowed) {
        console.log(`🚫 Blocked by robots.txt: ${url}`);
      }

      return allowed;

    } catch (error) {
      console.error('Error checking robots.txt:', error.message);
      // If we can't check robots.txt, be conservative and skip
      return false;
    }
  }

  /**
   * Respect rate limiting per domain
   * @param {string} domain - Domain to rate limit
   */
  async respectRateLimit(domain) {
    const now = Date.now();
    const lastRequest = this.requestQueue.get(domain) || 0;
    const timeSinceLastRequest = now - lastRequest;

    if (timeSinceLastRequest < this.rateLimit) {
      const waitTime = this.rateLimit - timeSinceLastRequest;
      console.log(`⏳ Rate limiting ${domain}: waiting ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.requestQueue.set(domain, Date.now());
  }

  /**
   * Scrape Google Play Store for app data
   * @param {string} packageId - Android package ID (e.g., 'com.example.app')
   * @returns {object} App data
   */
  async scrapeGooglePlayApp(packageId) {
    const url = `https://play.google.com/store/apps/details?id=${packageId}`;

    // Check robots.txt
    if (!await this.isAllowedByRobots(url)) {
      throw new Error('Blocked by robots.txt');
    }

    // Respect rate limit
    await this.respectRateLimit('play.google.com');

    await this.init();
    const page = await this.browser.newPage();

    try {
      // Set user agent
      await page.setUserAgent(this.userAgent);

      // Navigate to app page
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

      // Extract app data
      const appData = await page.evaluate(() => {
        const getText = (selector) => {
          const el = document.querySelector(selector);
          return el ? el.textContent.trim() : null;
        };

        const getAttr = (selector, attr) => {
          const el = document.querySelector(selector);
          return el ? el.getAttribute(attr) : null;
        };

        return {
          name: getText('h1[itemprop="name"]'),
          developer: getText('div.Vbfug a'),
          category: getText('a[itemprop="genre"]'),
          description: getText('div[itemprop="description"]'),
          iconUrl: getAttr('img[itemprop="image"]', 'src'),
          rating: getText('div.TT9eCd'),
          reviewCount: getText('div.g1rdde'),
          downloadCount: getText('div.wVqUob div:nth-child(2)'),
          contentRating: getText('div.wVqUob div:nth-child(4)'),
          lastUpdated: getText('div.xg1aie')
        };
      });

      await page.close();

      // Store in database cache
      await this.cacheScrapedData(url, appData);

      console.log(`✅ Scraped: ${appData.name}`);
      return appData;

    } catch (error) {
      await page.close();
      console.error(`Failed to scrape ${url}:`, error.message);
      throw error;
    }
  }

  /**
   * Scrape Apple App Store for app data
   * @param {string} appId - iOS app ID
   * @returns {object} App data
   */
  async scrapeAppStoreApp(appId) {
    // Use iTunes Search API (official, no scraping needed!)
    const url = `https://itunes.apple.com/lookup?id=${appId}`;

    try {
      const response = await axios.get(url, {
        headers: { 'User-Agent': this.userAgent },
        timeout: 10000
      });

      if (response.data.resultCount === 0) {
        throw new Error('App not found');
      }

      const app = response.data.results[0];

      const appData = {
        name: app.trackName,
        developer: app.artistName,
        category: app.primaryGenreName,
        description: app.description,
        iconUrl: app.artworkUrl512,
        rating: app.averageUserRating,
        reviewCount: app.userRatingCount,
        price: app.price,
        contentRating: app.contentAdvisoryRating,
        releaseDate: app.releaseDate
      };

      // Store in database cache
      await this.cacheScrapedData(url, appData);

      console.log(`✅ Fetched from iTunes API: ${appData.name}`);
      return appData;

    } catch (error) {
      console.error(`Failed to fetch from iTunes API:`, error.message);
      throw error;
    }
  }

  /**
   * Scrape app privacy policy for analysis
   * @param {string} privacyUrl - URL to privacy policy
   * @returns {object} Privacy analysis
   */
  async analyzePrivacyPolicy(privacyUrl) {
    if (!await this.isAllowedByRobots(privacyUrl)) {
      throw new Error('Blocked by robots.txt');
    }

    const domain = new URL(privacyUrl).host;
    await this.respectRateLimit(domain);

    await this.init();
    const page = await this.browser.newPage();

    try {
      await page.setUserAgent(this.userAgent);
      await page.goto(privacyUrl, { waitUntil: 'networkidle2', timeout: 30000 });

      // Extract text content
      const text = await page.evaluate(() => document.body.innerText);
      await page.close();

      // Analyze for privacy red flags
      const redFlags = this.detectPrivacyRedFlags(text);

      return {
        url: privacyUrl,
        length: text.length,
        redFlags,
        score: this.calculatePrivacyScore(redFlags)
      };

    } catch (error) {
      await page.close();
      console.error(`Failed to analyze privacy policy:`, error.message);
      return null;
    }
  }

  /**
   * Detect privacy red flags in policy text
   * @private
   */
  detectPrivacyRedFlags(text) {
    const flags = [];
    const lowerText = text.toLowerCase();

    // Check for concerning practices
    const concerns = {
      'sells data': /sell.*your.*data|sell.*personal.*information/i,
      'shares with third parties': /share.*third[\s-]?part(y|ies)|disclose.*partner/i,
      'tracks location': /track.*location|gps.*data|geolocation/i,
      'collects biometrics': /biometric|fingerprint|facial.*recognition/i,
      'unclear retention': /keep.*indefinite|retain.*long.*necessary/i,
      'broad data collection': /collect.*any.*information|all.*data.*you.*provide/i
    };

    for (const [flag, pattern] of Object.entries(concerns)) {
      if (pattern.test(lowerText)) {
        flags.push(flag);
      }
    }

    return flags;
  }

  /**
   * Calculate privacy score based on red flags
   * @private
   */
  calculatePrivacyScore(redFlags) {
    const maxScore = 5.0;
    const penaltyPerFlag = 0.5;
    return Math.max(0, maxScore - (redFlags.length * penaltyPerFlag));
  }

  /**
   * Cache scraped data to avoid re-scraping
   * @private
   */
  async cacheScrapedData(url, data) {
    try {
      await this.pool.query(
        `INSERT INTO scrape_cache (url, data, last_scraped)
         VALUES ($1, $2, CURRENT_TIMESTAMP)
         ON CONFLICT (url) 
         DO UPDATE SET data = $2, last_scraped = CURRENT_TIMESTAMP, is_stale = false`,
        [url, JSON.stringify(data)]
      );
    } catch (error) {
      console.error('Failed to cache scraped data:', error);
    }
  }

  /**
   * Get cached data if available and not stale
   * @param {string} url - URL to check cache for
   * @returns {object|null} Cached data or null
   */
  async getCachedData(url) {
    try {
      const result = await this.pool.query(
        `SELECT data, last_scraped FROM scrape_cache 
         WHERE url = $1 AND is_stale = false
         AND last_scraped > NOW() - INTERVAL '7 days'`,
        [url]
      );

      if (result.rows.length > 0) {
        console.log(`📦 Using cached data for ${url}`);
        return result.rows[0].data;
      }

      return null;
    } catch (error) {
      console.error('Failed to get cached data:', error);
      return null;
    }
  }

  /**
   * Batch scrape multiple apps (with rate limiting)
   * @param {array} apps - Array of {platform, id} objects
   * @returns {array} Array of scraped app data
   */
  async batchScrape(apps) {
    const results = [];

    for (const app of apps) {
      try {
        let data;
        
        if (app.platform === 'android') {
          data = await this.scrapeGooglePlayApp(app.id);
        } else if (app.platform === 'ios') {
          data = await this.scrapeAppStoreApp(app.id);
        }

        if (data) {
          results.push({ ...data, platform: app.platform, packageId: app.id });
        }

        // Extra delay between apps
        await new Promise(resolve => setTimeout(resolve, 3000));

      } catch (error) {
        console.error(`Failed to scrape ${app.id}:`, error.message);
        results.push({ error: error.message, packageId: app.id });
      }
    }

    return results;
  }
}

module.exports = EthicalScraper;

/**
 * USAGE EXAMPLE:
 * 
 * const scraper = new EthicalScraper(pool);
 * 
 * // Scrape single app
 * const appData = await scraper.scrapeGooglePlayApp('org.signal');
 * 
 * // Batch scrape
 * const apps = [
 *   { platform: 'android', id: 'org.signal' },
 *   { platform: 'ios', id: '874139669' }
 * ];
 * const results = await scraper.batchScrape(apps);
 * 
 * // Clean up
 * await scraper.close();
 */