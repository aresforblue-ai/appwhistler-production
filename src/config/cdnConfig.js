// src/config/cdnConfig.js
// CDN configuration for static asset serving

const { getSecret } = require('./secrets');

/**
 * CDN configuration for AppWhistler
 * Supports CloudFlare, AWS CloudFront, and other CDNs
 */
class CDNConfig {
  constructor() {
    this.cdnUrl = getSecret('CDN_URL', '');
    this.cdnProvider = getSecret('CDN_PROVIDER', 'cloudflare'); // cloudflare, cloudfront, cdn-js, custom
    this.environment = getSecret('NODE_ENV', 'development');
    this.isEnabled = !!this.cdnUrl;
  }

  /**
   * Get asset URL (local or CDN)
   * @param {string} path - Asset path (e.g., '/images/logo.png')
   * @returns {string} Full asset URL
   */
  getAssetUrl(path) {
    if (!this.isEnabled) {
      return path;
    }

    // Remove leading slash if present
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;

    // Append to CDN URL
    const cdnPath = this.cdnUrl.endsWith('/') 
      ? `${this.cdnUrl}${cleanPath}` 
      : `${this.cdnUrl}/${cleanPath}`;

    return cdnPath;
  }

  /**
   * Get cache headers for static assets
   * @param {string} contentType - MIME type
   * @returns {object} Cache control headers
   */
  getCacheHeaders(contentType = 'text/plain') {
    if (this.environment === 'development') {
      // No caching in development
      return {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      };
    }

    // Production caching strategy
    const oneYear = 31536000; // 1 year in seconds
    const oneDay = 86400; // 1 day in seconds

    // Cache immutable (hashed) assets for 1 year
    if (contentType.includes('javascript') || contentType.includes('css')) {
      if (this.hasFileHash()) {
        return {
          'Cache-Control': `public, max-age=${oneYear}, immutable`
        };
      } else {
        // Non-hashed files: cache for 1 day
        return {
          'Cache-Control': `public, max-age=${oneDay}`
        };
      }
    }

    // Images: 30 days
    if (contentType.includes('image')) {
      return {
        'Cache-Control': 'public, max-age=2592000, stale-while-revalidate=604800'
      };
    }

    // Fonts: 1 year
    if (contentType.includes('font')) {
      return {
        'Cache-Control': `public, max-age=${oneYear}, immutable`
      };
    }

    // Default: 1 day
    return {
      'Cache-Control': `public, max-age=${oneDay}`
    };
  }

  /**
   * Check if filename includes hash (Vite default: -[hash])
   */
  hasFileHash() {
    return /[-][a-f0-9]{8}/.test(this.cdnUrl || '');
  }

  /**
   * Get CloudFlare configuration (for Page Rules)
   * @returns {object} CloudFlare config
   */
  getCloudFlareConfig() {
    return {
      zones: [
        {
          path: '/assets/*',
          settings: {
            browserCacheTtl: 31536000, // 1 year
            cacheLevel: 'cache_everything',
            minify: {
              css: true,
              html: true,
              js: true
            }
          }
        },
        {
          path: '/static/*',
          settings: {
            browserCacheTtl: 2592000, // 30 days
            cacheLevel: 'cache_everything'
          }
        },
        {
          path: '/*',
          settings: {
            cacheLevel: 'bypass',
            minify: {
              css: true,
              html: true,
              js: true
            }
          }
        }
      ],
      security: {
        ssl: 'flexible', // or 'full' for production
        alwaysUseHttps: true,
        minTlsVersion: '1.2'
      },
      performance: {
        Polish: 'lossless', // or 'lossy'
        mirage: true,
        rocketLoader: true
      }
    };
  }

  /**
   * Get AWS CloudFront configuration
   * @returns {object} CloudFront config
   */
  getCloudFrontConfig() {
    return {
      behaviors: [
        {
          pathPattern: '/assets/*',
          allowedMethods: ['GET', 'HEAD', 'OPTIONS'],
          cachedMethods: ['GET', 'HEAD'],
          ttl: 31536000, // 1 year
          compress: true,
          viewerProtocolPolicy: 'https-only'
        },
        {
          pathPattern: '/static/*',
          allowedMethods: ['GET', 'HEAD'],
          ttl: 2592000, // 30 days
          compress: true
        },
        {
          pathPattern: '/*',
          allowedMethods: ['GET', 'HEAD', 'OPTIONS', 'PUT', 'POST', 'PATCH', 'DELETE'],
          ttl: 0, // No caching for dynamic content
          compress: true
        }
      ],
      priceClass: 'PriceClass_100', // US, Europe, Asia
      viewerProtocolPolicy: 'https-only'
    };
  }

  /**
   * Get configuration summary for logging
   */
  getSummary() {
    return {
      enabled: this.isEnabled,
      provider: this.cdnProvider,
      url: this.isEnabled ? this.cdnUrl : 'Not configured',
      environment: this.environment,
      fileHashSupport: this.hasFileHash(),
      message: this.isEnabled 
        ? `✅ CDN enabled: ${this.cdnUrl}` 
        : '⚠️  CDN not configured (using local assets)'
    };
  }
}

// Singleton instance
const cdnConfig = new CDNConfig();

module.exports = cdnConfig;
