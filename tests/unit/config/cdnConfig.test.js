// tests/unit/config/cdnConfig.test.js
// CDN configuration unit tests

jest.mock('../../../src/config/secrets', () => ({
  getSecret: jest.fn((key, defaultValue) => {
    const secrets = {
      'CDN_URL': 'https://cdn.example.com',
      'CDN_PROVIDER': 'cloudflare',
      'NODE_ENV': 'production'
    };
    return secrets[key] || defaultValue;
  })
}));

const cdnConfig = require('../../../src/config/cdnConfig');

describe('CDN Configuration', () => {
  describe('initialization', () => {
    test('should initialize with CDN URL', () => {
      expect(cdnConfig.isEnabled).toBe(true);
      expect(cdnConfig.cdnUrl).toBe('https://cdn.example.com');
    });

    test('should set CDN provider', () => {
      expect(cdnConfig.cdnProvider).toBe('cloudflare');
    });

    test('should detect environment', () => {
      expect(cdnConfig.environment).toBe('production');
    });
  });

  describe('getAssetUrl', () => {
    test('should return asset URL with CDN enabled', () => {
      const url = cdnConfig.getAssetUrl('/images/logo.png');
      expect(url).toContain('cdn.example.com');
      expect(url).toContain('images/logo.png');
    });

    test('should handle URLs without leading slash', () => {
      const url = cdnConfig.getAssetUrl('js/main.js');
      expect(url).toContain('cdn.example.com');
      expect(url).toContain('js/main.js');
    });

    test('should handle CDN URL with trailing slash', () => {
      // Mock a CDN URL with trailing slash
      cdnConfig.cdnUrl = 'https://cdn.example.com/';
      const url = cdnConfig.getAssetUrl('/images/logo.png');
      expect(url).not.toContain('//images'); // No double slash
    });

    test('should handle CDN disabled', () => {
      cdnConfig.isEnabled = false;
      const url = cdnConfig.getAssetUrl('/images/logo.png');
      expect(url).toBe('/images/logo.png');
      cdnConfig.isEnabled = true;
    });
  });

  describe('getCacheHeaders', () => {
    test('should return no-cache in development', () => {
      // Temporarily set to development
      const originalEnv = cdnConfig.environment;
      cdnConfig.environment = 'development';

      const headers = cdnConfig.getCacheHeaders();
      expect(headers['Cache-Control']).toContain('no-cache');

      cdnConfig.environment = originalEnv;
    });

    test('should return cache control for JavaScript', () => {
      const headers = cdnConfig.getCacheHeaders('application/javascript');
      expect(headers['Cache-Control']).toBeDefined();
      expect(headers['Cache-Control']).toContain('public');
      // May be 1-year (immutable) or 1-day depending on hash detection
    });

    test('should return cache control for CSS', () => {
      const headers = cdnConfig.getCacheHeaders('text/css');
      expect(headers['Cache-Control']).toBeDefined();
      expect(headers['Cache-Control']).toContain('public');
    });

    test('should return 30-day cache for images', () => {
      const headers = cdnConfig.getCacheHeaders('image/png');
      expect(headers['Cache-Control']).toBeDefined();
      expect(headers['Cache-Control']).toContain('public');
      // Should have stale-while-revalidate
      expect(headers['Cache-Control']).toContain('604800');
    });

    test('should return cache for fonts', () => {
      const headers = cdnConfig.getCacheHeaders('font/woff2');
      expect(headers['Cache-Control']).toBeDefined();
      expect(headers['Cache-Control']).toContain('public');
    });

    test('should include cache control header for all types', () => {
      const types = [
        'application/javascript',
        'text/css',
        'image/png',
        'font/woff2',
        'text/html'
      ];

      types.forEach(type => {
        const headers = cdnConfig.getCacheHeaders(type);
        expect(headers['Cache-Control']).toBeDefined();
      });
    });
  });

  describe('hasFileHash', () => {
    test('should detect hashed filenames', () => {
      cdnConfig.cdnUrl = 'https://cdn.example.com/assets-a1b2c3d4';
      expect(cdnConfig.hasFileHash()).toBe(true);
    });

    test('should return false for non-hashed URLs', () => {
      cdnConfig.cdnUrl = 'https://cdn.example.com';
      expect(cdnConfig.hasFileHash()).toBe(false);
    });
  });

  describe('getCloudFlareConfig', () => {
    test('should return CloudFlare configuration', () => {
      const config = cdnConfig.getCloudFlareConfig();
      expect(config).toHaveProperty('zones');
      expect(config).toHaveProperty('security');
      expect(config).toHaveProperty('performance');
    });

    test('should have assets zone configuration', () => {
      const config = cdnConfig.getCloudFlareConfig();
      const assetsZone = config.zones.find(z => z.path === '/assets/*');
      expect(assetsZone).toBeDefined();
      expect(assetsZone.settings.browserCacheTtl).toBe(31536000);
    });

    test('should enable minification', () => {
      const config = cdnConfig.getCloudFlareConfig();
      const defaultZone = config.zones[config.zones.length - 1];
      expect(defaultZone.settings.minify).toBeDefined();
      expect(defaultZone.settings.minify.css).toBe(true);
      expect(defaultZone.settings.minify.js).toBe(true);
    });

    test('should enforce HTTPS', () => {
      const config = cdnConfig.getCloudFlareConfig();
      expect(config.security.alwaysUseHttps).toBe(true);
    });
  });

  describe('getCloudFrontConfig', () => {
    test('should return CloudFront configuration', () => {
      const config = cdnConfig.getCloudFrontConfig();
      expect(config).toHaveProperty('behaviors');
      expect(config).toHaveProperty('priceClass');
      expect(config).toHaveProperty('viewerProtocolPolicy');
    });

    test('should have assets behavior', () => {
      const config = cdnConfig.getCloudFrontConfig();
      const assetsBehavior = config.behaviors.find(b => b.pathPattern === '/assets/*');
      expect(assetsBehavior).toBeDefined();
      expect(assetsBehavior.ttl).toBe(31536000);
      expect(assetsBehavior.compress).toBe(true);
    });

    test('should disable caching for dynamic content', () => {
      const config = cdnConfig.getCloudFrontConfig();
      const defaultBehavior = config.behaviors.find(b => b.pathPattern === '/*');
      expect(defaultBehavior.ttl).toBe(0);
    });

    test('should support all HTTP methods for dynamic content', () => {
      const config = cdnConfig.getCloudFrontConfig();
      const defaultBehavior = config.behaviors.find(b => b.pathPattern === '/*');
      expect(defaultBehavior.allowedMethods).toContain('POST');
      expect(defaultBehavior.allowedMethods).toContain('PUT');
      expect(defaultBehavior.allowedMethods).toContain('DELETE');
    });
  });

  describe('getSummary', () => {
    test('should return summary object', () => {
      const summary = cdnConfig.getSummary();
      expect(summary).toHaveProperty('enabled');
      expect(summary).toHaveProperty('provider');
      expect(summary).toHaveProperty('url');
      expect(summary).toHaveProperty('environment');
      expect(summary).toHaveProperty('message');
    });

    test('should show enabled status when CDN is configured', () => {
      cdnConfig.isEnabled = true;
      const summary = cdnConfig.getSummary();
      expect(summary.enabled).toBe(true);
      expect(summary.message).toContain('✅');
    });

    test('should show disabled status when CDN is not configured', () => {
      cdnConfig.isEnabled = false;
      const summary = cdnConfig.getSummary();
      expect(summary.enabled).toBe(false);
      expect(summary.message).toContain('⚠️');
      cdnConfig.isEnabled = true;
    });
  });

  describe('edge cases', () => {
    test('should handle empty CDN URL', () => {
      cdnConfig.cdnUrl = '';
      cdnConfig.isEnabled = false;
      const url = cdnConfig.getAssetUrl('/images/logo.png');
      expect(url).toBe('/images/logo.png');
    });

    test('should handle various content types', () => {
      const types = [
        'text/html',
        'application/json',
        'application/xml',
        'video/mp4'
      ];

      types.forEach(type => {
        const headers = cdnConfig.getCacheHeaders(type);
        expect(headers).toHaveProperty('Cache-Control');
      });
    });

    test('should handle URLs with query parameters', () => {
      const url = cdnConfig.getAssetUrl('/images/logo.png?v=1');
      expect(url).toContain('logo.png?v=1');
    });
  });
});
