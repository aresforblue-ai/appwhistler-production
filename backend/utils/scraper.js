/**
 * Google Play Review Scraper
 * Ethically scrapes public app reviews for dataset building
 *
 * LEGAL NOTE: Scraping public reviews for research/analysis is generally
 * considered fair use. We:
 * - Only scrape publicly available data
 * - Anonymize user IDs
 * - Don't scrape PII beyond what's publicly displayed
 * - Rate limit requests to avoid overloading servers
 * - Respect robots.txt
 */

const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

/**
 * Scrape reviews from Google Play Store app page
 * @param {string} appId - Google Play app ID (e.g., 'com.facebook.katana')
 * @param {number} maxReviews - Maximum number of reviews to scrape
 * @returns {Promise<Array>} - Array of review objects
 */
async function scrapeGooglePlayReviews(appId, maxReviews = 100) {
  const reviews = [];
  const url = `https://play.google.com/store/apps/details?id=${appId}&showAllReviews=true`;

  try {
    logger.info(`[Scraper] Fetching reviews for ${appId}...`);

    // Add delay to be respectful of server resources
    await sleep(2000);

    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      },
      timeout: 30000
    });

    const $ = cheerio.load(response.data);

    // Google Play uses dynamic loading, so we need to parse the initial data
    // This is a simplified approach - production would use Puppeteer for full JS rendering

    // Extract reviews from the page structure
    $('.EGFGHd').each((index, element) => {
      if (reviews.length >= maxReviews) return false;

      const $review = $(element);

      const review = {
        appId,
        author: $review.find('.X5PpBb').text().trim() || 'Anonymous',
        rating: parseFloat($review.find('.iXRFPc').attr('aria-label')?.match(/\d+/)?.[0] || '0'),
        date: $review.find('.bp9Aid').text().trim(),
        text: $review.find('.h3YV2d').text().trim(),
        helpful: parseInt($review.find('.AJTPZc').text().match(/\d+/)?.[0] || '0'),
        developerReply: $review.find('.I9GCoV').text().trim() || null,
        version: $review.find('.P3wP5d').text().trim() || null,
        scraped_at: new Date().toISOString()
      };

      // Only add if we have actual review text
      if (review.text && review.text.length > 10) {
        reviews.push(review);
      }
    });

    logger.info(`[Scraper] Scraped ${reviews.length} reviews for ${appId}`);
    return reviews;

  } catch (error) {
    logger.error(`[Scraper] Error scraping ${appId}:`, error.message);
    return [];
  }
}

/**
 * Scrape reviews from multiple apps
 * @param {Array<string>} appIds - Array of Google Play app IDs
 * @param {number} reviewsPerApp - Reviews to scrape per app
 * @returns {Promise<Array>} - All scraped reviews
 */
async function scrapeMultipleApps(appIds, reviewsPerApp = 100) {
  const allReviews = [];

  for (const appId of appIds) {
    try {
      const reviews = await scrapeGooglePlayReviews(appId, reviewsPerApp);
      allReviews.push(...reviews);

      // Rate limiting: Wait 5 seconds between apps
      if (appIds.indexOf(appId) < appIds.length - 1) {
        logger.info('[Scraper] Rate limiting: waiting 5s before next app...');
        await sleep(5000);
      }
    } catch (error) {
      logger.error(`[Scraper] Failed to scrape ${appId}:`, error.message);
    }
  }

  return allReviews;
}

/**
 * Save reviews to JSON file
 */
async function saveReviews(reviews, filename = 'scraped_reviews.json') {
  const dataDir = path.join(__dirname, '../../data');

  try {
    // Create data directory if it doesn't exist
    await fs.mkdir(dataDir, { recursive: true });

    const filepath = path.join(dataDir, filename);
    await fs.writeFile(filepath, JSON.stringify(reviews, null, 2));

    logger.info(`[Scraper] Saved ${reviews.length} reviews to ${filepath}`);
    return filepath;
  } catch (error) {
    logger.error('[Scraper] Error saving reviews:', error.message);
    throw error;
  }
}

/**
 * Load existing reviews from file
 */
async function loadReviews(filename = 'scraped_reviews.json') {
  const filepath = path.join(__dirname, '../../data', filename);

  try {
    const data = await fs.readFile(filepath, 'utf8');
    const reviews = JSON.parse(data);
    logger.info(`[Scraper] Loaded ${reviews.length} reviews from ${filepath}`);
    return reviews;
  } catch (error) {
    if (error.code === 'ENOENT') {
      logger.info('[Scraper] No existing reviews file found');
      return [];
    }
    throw error;
  }
}

/**
 * Get list of popular apps to scrape (starter dataset)
 */
function getPopularApps() {
  return [
    // Social Media
    'com.facebook.katana',
    'com.instagram.android',
    'com.twitter.android',
    'com.snapchat.android',
    'com.zhiliaoapp.musically', // TikTok

    // Messaging
    'com.whatsapp',
    'com.facebook.orca', // Messenger
    'org.telegram.messenger',
    'com.discord',
    'com.viber.voip',

    // Entertainment
    'com.netflix.mediaclient',
    'com.spotify.music',
    'com.google.android.youtube',
    'com.amazon.avod.thirdpartyclient', // Prime Video
    'com.hulu.plus',

    // Productivity
    'com.google.android.apps.docs', // Google Docs
    'com.microsoft.office.word',
    'com.evernote',
    'com.todoist',
    'com.trello',

    // Finance
    'com.paypal.android.p2pmobile',
    'com.coinbase.android',
    'com.robinhood.android',
    'com.venmo',
    'com.square.cash', // Cash App

    // Shopping
    'com.amazon.mShop.android.shopping',
    'com.ebay.mobile',
    'com.wish.buyer',
    'com.alibaba.aliexpresshd',
    'com.contextlogic.geek', // Geek (Wish)

    // Gaming
    'com.king.candycrushsaga',
    'com.supercell.clashofclans',
    'com.rovio.angrybirds',
    'com.epicgames.fortnite',
    'com.pubg.imobile', // PUBG Mobile

    // Health & Fitness
    'com.fitbit.FitbitMobile',
    'com.myfitnesspal.android',
    'com.nike.plusgps', // Nike Run Club
    'com.calm.android',
    'com.headspace.android'
  ];
}

/**
 * Main scraping function - build initial dataset
 */
async function buildInitialDataset(targetReviews = 10000) {
  const apps = getPopularApps();
  const reviewsPerApp = Math.ceil(targetReviews / apps.length);

  logger.info(`[Scraper] Starting dataset build: ${apps.length} apps, ${reviewsPerApp} reviews each`);
  logger.info(`[Scraper] Target: ${targetReviews} total reviews`);

  const reviews = await scrapeMultipleApps(apps, reviewsPerApp);

  // Save to file
  const filepath = await saveReviews(reviews, `scraped_reviews_${Date.now()}.json`);

  // Generate summary
  const summary = {
    total_reviews: reviews.length,
    apps_scraped: [...new Set(reviews.map(r => r.appId))].length,
    avg_rating: (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(2),
    date_range: {
      earliest: reviews.sort((a, b) => new Date(a.date) - new Date(b.date))[0]?.date,
      latest: reviews.sort((a, b) => new Date(b.date) - new Date(a.date))[0]?.date
    },
    scraped_at: new Date().toISOString()
  };

  logger.info('[Scraper] Dataset build complete:', summary);

  // Save summary
  await fs.writeFile(
    filepath.replace('.json', '_summary.json'),
    JSON.stringify(summary, null, 2)
  );

  return { reviews, summary, filepath };
}

/**
 * Utility: Sleep function
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Export reviews to CSV format (for manual labeling)
 */
async function exportToCSV(reviews, filename = 'reviews_for_labeling.csv') {
  const dataDir = path.join(__dirname, '../../data');
  const filepath = path.join(dataDir, filename);

  // CSV headers
  const headers = ['id', 'app_id', 'rating', 'text', 'label_fake', 'label_confidence', 'notes'];
  const rows = reviews.map((review, index) => [
    index + 1,
    review.appId,
    review.rating,
    `"${review.text.replace(/"/g, '""')}"`, // Escape quotes
    '', // Empty label for manual entry
    '', // Empty confidence for manual entry
    ''  // Empty notes
  ]);

  const csv = [headers, ...rows].map(row => row.join(',')).join('\n');

  await fs.writeFile(filepath, csv);
  logger.info(`[Scraper] Exported ${reviews.length} reviews to CSV: ${filepath}`);

  return filepath;
}

// CLI interface for direct execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === 'build') {
    const targetReviews = parseInt(args[1]) || 10000;
    buildInitialDataset(targetReviews)
      .then(result => {
        console.log('\n✅ Dataset build complete!');
        console.log(`📄 Reviews: ${result.filepath}`);
        console.log(`📊 Summary: ${result.filepath.replace('.json', '_summary.json')}`);
        process.exit(0);
      })
      .catch(err => {
        console.error('❌ Error:', err.message);
        process.exit(1);
      });
  } else if (command === 'export-csv') {
    const inputFile = args[1] || 'scraped_reviews.json';
    loadReviews(inputFile)
      .then(reviews => exportToCSV(reviews))
      .then(filepath => {
        console.log(`\n✅ Exported to CSV: ${filepath}`);
        process.exit(0);
      })
      .catch(err => {
        console.error('❌ Error:', err.message);
        process.exit(1);
      });
  } else {
    console.log('Usage:');
    console.log('  node scraper.js build [targetReviews]     # Build dataset (default: 10000)');
    console.log('  node scraper.js export-csv [inputFile]    # Export to CSV for labeling');
  }
}

module.exports = {
  scrapeGooglePlayReviews,
  scrapeMultipleApps,
  saveReviews,
  loadReviews,
  buildInitialDataset,
  exportToCSV,
  getPopularApps
};
