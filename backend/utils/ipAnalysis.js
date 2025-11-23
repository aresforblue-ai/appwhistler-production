/**
 * IP Address Analysis for Fake Review Detection
 * Detects suspicious patterns in IP addresses and network behavior
 */

const logger = require('./logger');

// Known VPN/Proxy/Datacenter IP ranges (simplified - in production use a service like IPHub)
const SUSPICIOUS_IP_RANGES = [
  { range: '10.0.0.0/8', type: 'PRIVATE' },
  { range: '172.16.0.0/12', type: 'PRIVATE' },
  { range: '192.168.0.0/16', type: 'PRIVATE' },
  // AWS datacenter ranges (sample)
  { range: '3.0.0.0/8', type: 'DATACENTER' },
  { range: '52.0.0.0/8', type: 'DATACENTER' },
  // Common VPN providers (sample)
  { range: '91.214.0.0/16', type: 'VPN' },
  { range: '185.159.156.0/22', type: 'VPN' }
];

/**
 * Analyze IP address for suspicious characteristics
 */
function analyzeIPAddress(ipAddress, metadata = {}) {
  const analysis = {
    ip: ipAddress,
    riskScore: 0,
    flags: [],
    type: 'RESIDENTIAL', // Default assumption
    country: metadata.country || null,
    asn: metadata.asn || null,
    isp: metadata.isp || null
  };

  // Check if IP is in suspicious ranges
  const ipType = checkIPType(ipAddress);
  if (ipType !== 'RESIDENTIAL') {
    analysis.type = ipType;
    analysis.riskScore += ipType === 'VPN' ? 40 : ipType === 'DATACENTER' ? 60 : 20;
    analysis.flags.push({
      category: 'IP Type',
      severity: ipType === 'DATACENTER' ? 'HIGH' : 'MEDIUM',
      description: `IP appears to be from ${ipType}`
    });
  }

  // Check for Tor exit nodes (simplified detection)
  if (isTorExit(ipAddress)) {
    analysis.riskScore += 70;
    analysis.type = 'TOR';
    analysis.flags.push({
      category: 'Anonymization',
      severity: 'CRITICAL',
      description: 'IP is a known Tor exit node'
    });
  }

  // Geographic inconsistencies
  if (metadata.previousCountries && metadata.country) {
    const countryChanges = metadata.previousCountries.filter(c => c !== metadata.country).length;
    if (countryChanges > 2) {
      analysis.riskScore += 25;
      analysis.flags.push({
        category: 'Geographic Anomaly',
        severity: 'MEDIUM',
        description: `Frequent country changes (${countryChanges} different countries)`
      });
    }
  }

  // Time-based analysis
  if (metadata.reviewsInLast24h && metadata.reviewsInLast24h > 10) {
    analysis.riskScore += 30;
    analysis.flags.push({
      category: 'Rate Limiting',
      severity: 'HIGH',
      description: `${metadata.reviewsInLast24h} reviews from this IP in 24h`
    });
  }

  return analysis;
}

/**
 * Detect reviews from same IP address
 */
function detectIPClustering(reviews, pool) {
  const ipGroups = {};
  const suspiciousIPs = [];

  reviews.forEach(review => {
    if (!review.ip_address) return;

    if (!ipGroups[review.ip_address]) {
      ipGroups[review.ip_address] = [];
    }
    ipGroups[review.ip_address].push(review);
  });

  // Flag IPs with multiple reviews
  Object.entries(ipGroups).forEach(([ip, reviewList]) => {
    if (reviewList.length >= 3) {
      const userIds = new Set(reviewList.map(r => r.user_id));

      suspiciousIPs.push({
        ip,
        reviewCount: reviewList.length,
        uniqueUsers: userIds.size,
        riskScore: calculateClusterRiskScore(reviewList.length, userIds.size),
        description: userIds.size === 1
          ? `${reviewList.length} reviews from 1 user on same IP`
          : `${reviewList.length} reviews from ${userIds.size} users on same IP (potential review farm)`
      });
    }
  });

  return suspiciousIPs;
}

/**
 * Calculate risk score for IP clustering
 */
function calculateClusterRiskScore(reviewCount, uniqueUsers) {
  let score = 0;

  // More reviews = higher risk
  if (reviewCount >= 10) score += 60;
  else if (reviewCount >= 5) score += 40;
  else if (reviewCount >= 3) score += 20;

  // Same user vs different users
  if (uniqueUsers === 1 && reviewCount > 5) {
    score += 20; // Suspicious but could be legitimate heavy user
  } else if (uniqueUsers > 1 && reviewCount / uniqueUsers > 3) {
    score += 40; // Multiple users sharing IP with high review rate = review farm
  }

  return Math.min(score, 100);
}

/**
 * Check IP type (VPN, datacenter, residential, etc.)
 */
function checkIPType(ipAddress) {
  // Simple check - in production use MaxMind GeoIP2 or IPHub API

  // Check against known ranges
  for (const range of SUSPICIOUS_IP_RANGES) {
    if (isIPInRange(ipAddress, range.range)) {
      return range.type;
    }
  }

  // Check for cloud providers by IP pattern
  const octets = ipAddress.split('.').map(Number);
  if (octets[0] === 3 || octets[0] === 52 || octets[0] === 54) {
    return 'DATACENTER'; // AWS
  }
  if (octets[0] === 104 && octets[1] === 154) {
    return 'DATACENTER'; // Google Cloud
  }

  return 'RESIDENTIAL';
}

/**
 * Check if IP is in CIDR range (simplified)
 */
function isIPInRange(ip, cidr) {
  const [rangeIP, bits] = cidr.split('/');
  const ipNum = ipToNumber(ip);
  const rangeNum = ipToNumber(rangeIP);
  const mask = -1 << (32 - parseInt(bits));

  return (ipNum & mask) === (rangeNum & mask);
}

/**
 * Convert IP to number for comparison
 */
function ipToNumber(ip) {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0;
}

/**
 * Check if IP is Tor exit node (simplified)
 */
function isTorExit(ipAddress) {
  // In production, query https://check.torproject.org/torbulkexitlist
  // or maintain a local copy of the Tor exit node list

  // For now, basic heuristic
  const torExitNodes = [
    '185.220.', // Common Tor range
    '185.100.',
    '199.249.'
  ];

  return torExitNodes.some(prefix => ipAddress.startsWith(prefix));
}

/**
 * Analyze review velocity from IP
 */
async function analyzeIPVelocity(ipAddress, pool) {
  try {
    // Count reviews from this IP in various time windows
    const velocityQuery = `
      SELECT
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 hour') as last_hour,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as last_day,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as last_week,
        COUNT(DISTINCT user_id) as unique_users
      FROM reviews
      WHERE ip_address = $1
    `;

    const result = await pool.query(velocityQuery, [ipAddress]);
    const stats = result.rows[0];

    let riskScore = 0;
    const flags = [];

    // Suspicious velocity patterns
    if (stats.last_hour > 5) {
      riskScore += 50;
      flags.push({
        category: 'Velocity',
        severity: 'CRITICAL',
        description: `${stats.last_hour} reviews in last hour from IP`
      });
    }

    if (stats.last_day > 20) {
      riskScore += 40;
      flags.push({
        category: 'Velocity',
        severity: 'HIGH',
        description: `${stats.last_day} reviews in last 24h from IP`
      });
    }

    // Multiple users from same IP with high velocity
    if (stats.unique_users > 5 && stats.last_week > 50) {
      riskScore += 60;
      flags.push({
        category: 'Review Farm',
        severity: 'CRITICAL',
        description: `${stats.unique_users} users, ${stats.last_week} reviews in 7 days - possible review farm`
      });
    }

    return {
      riskScore: Math.min(riskScore, 100),
      flags,
      stats: {
        lastHour: parseInt(stats.last_hour),
        lastDay: parseInt(stats.last_day),
        lastWeek: parseInt(stats.last_week),
        uniqueUsers: parseInt(stats.unique_users)
      }
    };

  } catch (error) {
    logger.error('[IP Velocity] Error:', error.message);
    return { riskScore: 0, flags: [], stats: {} };
  }
}

/**
 * Get IP reputation score (0-100, higher = more suspicious)
 */
async function getIPReputation(ipAddress) {
  // In production, integrate with:
  // - IPQualityScore
  // - AbuseIPDB
  // - Project Honey Pot
  // - Shodan

  // For now, return basic analysis
  const analysis = analyzeIPAddress(ipAddress);
  return {
    reputationScore: analysis.riskScore,
    type: analysis.type,
    flags: analysis.flags
  };
}

module.exports = {
  analyzeIPAddress,
  detectIPClustering,
  analyzeIPVelocity,
  getIPReputation,
  checkIPType,
  calculateClusterRiskScore
};
