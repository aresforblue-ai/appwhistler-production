/**
 * Device Fingerprinting for Fake Review Detection
 * Detects suspicious patterns in device usage and browser fingerprints
 */

const crypto = require('crypto');
const logger = require('./logger');

/**
 * Generate device fingerprint from request headers and metadata
 */
function generateFingerprint(req) {
  const components = {
    userAgent: req.headers['user-agent'] || '',
    acceptLanguage: req.headers['accept-language'] || '',
    acceptEncoding: req.headers['accept-encoding'] || '',
    platform: req.body?.platform || '',
    screen: req.body?.screen || '',
    timezone: req.body?.timezone || '',
    canvas: req.body?.canvasFingerprint || '',
    webgl: req.body?.webglFingerprint || '',
    fonts: req.body?.fonts || []
  };

  // Create hash of all components
  const fingerprintString = JSON.stringify(components);
  const hash = crypto.createHash('sha256').update(fingerprintString).digest('hex');

  return {
    fingerprint: hash,
    components,
    timestamp: new Date().toISOString()
  };
}

/**
 * Analyze device fingerprint for suspicious characteristics
 */
function analyzeDeviceFingerprint(fingerprint, metadata = {}) {
  const analysis = {
    fingerprint: fingerprint.fingerprint,
    riskScore: 0,
    flags: [],
    deviceType: detectDeviceType(fingerprint.components),
    browserType: detectBrowserType(fingerprint.components.userAgent),
    isBot: detectBot(fingerprint.components.userAgent)
  };

  // Check for bot signatures
  if (analysis.isBot) {
    analysis.riskScore += 80;
    analysis.flags.push({
      category: 'Bot Detection',
      severity: 'CRITICAL',
      description: 'User-Agent indicates automated bot'
    });
  }

  // Check for suspicious user agents
  if (isSuspiciousUserAgent(fingerprint.components.userAgent)) {
    analysis.riskScore += 50;
    analysis.flags.push({
      category: 'User Agent',
      severity: 'HIGH',
      description: 'Suspicious or unusual user agent string'
    });
  }

  // Check for headless browser indicators
  if (isHeadlessBrowser(fingerprint.components)) {
    analysis.riskScore += 70;
    analysis.flags.push({
      category: 'Automation',
      severity: 'CRITICAL',
      description: 'Headless browser detected (Puppeteer/Selenium)'
    });
  }

  // Check for device fingerprint inconsistencies
  if (fingerprint.components.screen && fingerprint.components.userAgent) {
    const inconsistent = detectInconsistencies(fingerprint.components);
    if (inconsistent) {
      analysis.riskScore += 40;
      analysis.flags.push({
        category: 'Fingerprint Mismatch',
        severity: 'MEDIUM',
        description: 'Device characteristics don\'t match user agent'
      });
    }
  }

  // Check for missing fingerprint components (privacy tools)
  const missingComponents = countMissingComponents(fingerprint.components);
  if (missingComponents > 3) {
    analysis.riskScore += 30;
    analysis.flags.push({
      category: 'Privacy Tools',
      severity: 'MEDIUM',
      description: `Missing ${missingComponents} fingerprint components (privacy browser/VPN)`
    });
  }

  return analysis;
}

/**
 * Detect multiple accounts from same device
 */
async function detectDeviceReuse(fingerprintHash, pool) {
  try {
    const query = `
      SELECT
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(*) as total_reviews,
        ARRAY_AGG(DISTINCT user_id) as user_ids,
        MIN(created_at) as first_seen,
        MAX(created_at) as last_seen
      FROM reviews
      WHERE device_fingerprint = $1
      GROUP BY device_fingerprint
    `;

    const result = await pool.query(query, [fingerprintHash]);

    if (result.rows.length === 0) {
      return { riskScore: 0, flags: [], newDevice: true };
    }

    const stats = result.rows[0];
    const uniqueUsers = parseInt(stats.unique_users);
    const totalReviews = parseInt(stats.total_reviews);

    let riskScore = 0;
    const flags = [];

    // Multiple users on same device = suspicious
    if (uniqueUsers > 1) {
      riskScore += uniqueUsers * 20; // 20 points per additional user
      flags.push({
        category: 'Device Sharing',
        severity: uniqueUsers > 5 ? 'CRITICAL' : 'HIGH',
        description: `${uniqueUsers} different users from same device fingerprint`
      });
    }

    // High review velocity from single device
    if (totalReviews > 50) {
      riskScore += 40;
      flags.push({
        category: 'Review Volume',
        severity: 'HIGH',
        description: `${totalReviews} reviews from this device`
      });
    }

    return {
      riskScore: Math.min(riskScore, 100),
      flags,
      stats: {
        uniqueUsers,
        totalReviews,
        firstSeen: stats.first_seen,
        lastSeen: stats.last_seen
      }
    };

  } catch (error) {
    logger.error('[Device Reuse] Error:', error.message);
    return { riskScore: 0, flags: [], error: error.message };
  }
}

/**
 * Detect device type from fingerprint
 */
function detectDeviceType(components) {
  const ua = components.userAgent.toLowerCase();

  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
    return 'MOBILE';
  }
  if (ua.includes('tablet') || ua.includes('ipad')) {
    return 'TABLET';
  }
  if (ua.includes('bot') || ua.includes('crawler') || ua.includes('spider')) {
    return 'BOT';
  }

  return 'DESKTOP';
}

/**
 * Detect browser type
 */
function detectBrowserType(userAgent) {
  const ua = userAgent.toLowerCase();

  if (ua.includes('chrome') && !ua.includes('edg')) return 'Chrome';
  if (ua.includes('firefox')) return 'Firefox';
  if (ua.includes('safari') && !ua.includes('chrome')) return 'Safari';
  if (ua.includes('edg')) return 'Edge';
  if (ua.includes('opera') || ua.includes('opr')) return 'Opera';

  return 'Unknown';
}

/**
 * Detect if user agent indicates a bot
 */
function detectBot(userAgent) {
  const botSignatures = [
    'bot', 'crawler', 'spider', 'scraper',
    'headless', 'puppeteer', 'selenium', 'phantomjs',
    'curl', 'wget', 'python', 'java',
    'http', 'axios', 'request', 'fetch'
  ];

  const ua = userAgent.toLowerCase();
  return botSignatures.some(sig => ua.includes(sig));
}

/**
 * Check for suspicious user agent patterns
 */
function isSuspiciousUserAgent(userAgent) {
  if (!userAgent || userAgent.length < 10) return true;

  // Check for very old browsers
  if (userAgent.includes('MSIE 6') || userAgent.includes('MSIE 7')) {
    return true;
  }

  // Check for unusual patterns
  if (userAgent.includes('compatible;') && !userAgent.includes('MSIE')) {
    return true;
  }

  // Check for custom/spoofed UAs
  const commonBrowsers = ['Chrome', 'Firefox', 'Safari', 'Edge', 'Opera'];
  const hasCommonBrowser = commonBrowsers.some(b => userAgent.includes(b));

  if (!hasCommonBrowser && !userAgent.includes('Mobile')) {
    return true;
  }

  return false;
}

/**
 * Detect headless browser (Puppeteer, Selenium, etc.)
 */
function isHeadlessBrowser(components) {
  const ua = components.userAgent.toLowerCase();

  // Known headless signatures
  if (ua.includes('headless') || ua.includes('phantomjs')) {
    return true;
  }

  // Chrome headless indicators
  if (ua.includes('chrome') && ua.includes('headlesschrome')) {
    return true;
  }

  // Selenium indicators
  if (ua.includes('selenium') || ua.includes('webdriver')) {
    return true;
  }

  // Missing components that headless browsers often lack
  if (!components.canvas && !components.webgl && components.userAgent.includes('Chrome')) {
    return true; // Real Chrome always has these
  }

  return false;
}

/**
 * Detect inconsistencies in device fingerprint
 */
function detectInconsistencies(components) {
  const ua = components.userAgent;
  const screen = components.screen;

  // Check mobile UA with desktop screen resolution
  if (ua.includes('Mobile') && screen) {
    const [width, height] = screen.split('x').map(Number);
    if (width > 1920 || height > 1080) {
      return true; // Mobile device with desktop resolution = spoofed
    }
  }

  // Check desktop UA with mobile screen
  if (!ua.includes('Mobile') && screen) {
    const [width, height] = screen.split('x').map(Number);
    if (width < 800 && height < 600) {
      return true; // Desktop with tiny mobile screen = spoofed
    }
  }

  return false;
}

/**
 * Count missing fingerprint components
 */
function countMissingComponents(components) {
  let missing = 0;

  if (!components.canvas) missing++;
  if (!components.webgl) missing++;
  if (!components.fonts || components.fonts.length === 0) missing++;
  if (!components.timezone) missing++;
  if (!components.platform) missing++;
  if (!components.screen) missing++;

  return missing;
}

/**
 * Analyze device switching patterns
 */
async function analyzeDeviceSwitching(userId, pool) {
  try {
    const query = `
      SELECT
        COUNT(DISTINCT device_fingerprint) as unique_devices,
        COUNT(*) as total_reviews,
        ARRAY_AGG(DISTINCT device_fingerprint) as fingerprints,
        MIN(created_at) as first_review,
        MAX(created_at) as last_review
      FROM reviews
      WHERE user_id = $1
      GROUP BY user_id
    `;

    const result = await pool.query(query, [userId]);

    if (result.rows.length === 0) {
      return { riskScore: 0, flags: [] };
    }

    const stats = result.rows[0];
    const uniqueDevices = parseInt(stats.unique_devices);
    const totalReviews = parseInt(stats.total_reviews);

    let riskScore = 0;
    const flags = [];

    // Too many devices = suspicious
    if (uniqueDevices > 10) {
      riskScore += 60;
      flags.push({
        category: 'Device Switching',
        severity: 'CRITICAL',
        description: `User has ${uniqueDevices} different device fingerprints`
      });
    } else if (uniqueDevices > 5) {
      riskScore += 30;
      flags.push({
        category: 'Device Switching',
        severity: 'MEDIUM',
        description: `User has ${uniqueDevices} different devices (possible spoofing)`
      });
    }

    // Frequent device changes
    const daysSinceFirstReview = (new Date() - new Date(stats.first_review)) / (1000 * 60 * 60 * 24);
    const devicesPerMonth = (uniqueDevices / daysSinceFirstReview) * 30;

    if (devicesPerMonth > 3) {
      riskScore += 40;
      flags.push({
        category: 'Rapid Device Switching',
        severity: 'HIGH',
        description: `${devicesPerMonth.toFixed(1)} different devices per month`
      });
    }

    return {
      riskScore: Math.min(riskScore, 100),
      flags,
      stats: {
        uniqueDevices,
        totalReviews,
        devicesPerMonth: parseFloat(devicesPerMonth.toFixed(2))
      }
    };

  } catch (error) {
    logger.error('[Device Switching] Error:', error.message);
    return { riskScore: 0, flags: [], error: error.message };
  }
}

module.exports = {
  generateFingerprint,
  analyzeDeviceFingerprint,
  detectDeviceReuse,
  analyzeDeviceSwitching,
  detectDeviceType,
  detectBrowserType,
  detectBot,
  isHeadlessBrowser
};
