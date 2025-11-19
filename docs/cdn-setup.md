# CDN Setup Guide for AppWhistler

## Overview

AppWhistler is configured to work with Content Delivery Networks (CDNs) for optimized static asset delivery. This guide covers setup for CloudFlare, AWS CloudFront, and other CDN providers.

## Quick Start

### Environment Variables

Add these to your `.env` file:

```bash
# CDN Configuration
CDN_URL=https://cdn.example.com
CDN_PROVIDER=cloudflare  # cloudflare, cloudfront, or custom
```

### Build with CDN

```bash
# Development (local assets)
npm run client

# Production (CDN-ready assets)
CDN_URL=https://cdn.example.com npm run client:build
```

## CloudFlare Setup

### 1. Create a CloudFlare Account

- Sign up at [https://dash.cloudflare.com](https://dash.cloudflare.com)
- Add your domain
- Update nameservers (shown in CloudFlare dashboard)

### 2. Configure Zone Settings

```javascript
// From src/config/cdnConfig.js - CloudFlare config:
{
  zones: [
    {
      path: '/assets/*',
      settings: {
        browserCacheTtl: 31536000, // 1 year
        cacheLevel: 'cache_everything'
      }
    },
    {
      path: '/static/*',
      settings: {
        browserCacheTtl: 2592000, // 30 days
        cacheLevel: 'cache_everything'
      }
    }
  ]
}
```

### 3. CloudFlare Page Rules

Set up page rules in CloudFlare dashboard:

#### Rule 1: Cache Static Assets (1 year)

- URL pattern: `example.com/assets/*`
- Cache Level: Cache Everything
- Browser Cache TTL: 1 year
- Minify: Enable CSS, HTML, JavaScript

#### Rule 2: Cache Build Files (30 days)

- URL pattern: `example.com/static/*`
- Cache Level: Cache Everything
- Browser Cache TTL: 30 days

#### Rule 3: Dynamic Content (bypass cache)

- URL pattern: `example.com/*`
- Cache Level: Bypass
- Minify: Enable all

### 4. SSL/TLS Settings

- Mode: Full
- Minimum TLS Version: 1.2
- Always use HTTPS: On

### 5. Performance Settings

- Polish: Lossless (or Lossy for aggressive compression)
- Mirage: On (lazy load images)
- Rocket Loader: On (prioritize critical JS)
- Prefetch Preload: On

## AWS CloudFront Setup

### 1. Create CloudFront Distribution

```bash
aws cloudfront create-distribution --distribution-config file://cloudfront-config.json
```

### 2. Distribution Configuration

#### Origin Settings

- Domain Name: `example.com`
- Protocol: HTTPS
- HTTP Port: 80
- HTTPS Port: 443

#### Behaviors

##### Behavior 1: Assets (hashed files)

```json
{
  "PathPattern": "/assets/*",
  "Compress": true,
  "ViewerProtocolPolicy": "redirect-to-https",
  "CachePolicyId": "658327ea-f89d-4fab-a63d-7e88639e58f6",
  "TTL": 31536000
}
```

##### Behavior 2: Static Content

```json
{
  "PathPattern": "/static/*",
  "Compress": true,
  "ViewerProtocolPolicy": "redirect-to-https",
  "CachePolicyId": "658327ea-f89d-4fab-a63d-7e88639e58f6",
  "TTL": 2592000
}
```

##### Behavior 3: Dynamic (default)

```json
{
  "PathPattern": "*",
  "Compress": true,
  "ViewerProtocolPolicy": "redirect-to-https",
  "CachePolicyId": "4135ea3d-c35d-46eb-81d7-reeSJmXQljc"
}
```

### 3. Alternate Domain Names (CNAME)

- Add your CDN subdomain: `cdn.example.com`

### 4. SSL Certificate

- Certificate Source: ACM (AWS Certificate Manager)

```bash
aws acm request-certificate \
  --domain-name example.com \
  --validation-method DNS \
  --region us-east-1
```

## Asset Organization

Vite automatically organizes assets based on file type:

```bash
dist/
├── js/
│   ├── vendor-[hash].js      (1 year cache)
│   ├── apollo-[hash].js      (1 year cache)
│   └── main-[hash].js        (1 year cache)
├── css/
│   └── style-[hash].css      (1 year cache)
├── images/
│   ├── logo-[hash].png       (30 days cache)
│   └── icons-[hash].svg      (30 days cache)
├── fonts/
│   ├── font-[hash].woff2     (1 year cache)
│   └── font-[hash].ttf       (1 year cache)
└── index.html                (no cache)
```

## Environment-Based URLs

The React frontend automatically detects asset URLs:

```javascript
// In production with CDN_URL set:
// <script src="https://cdn.example.com/js/main-abc123.js"></script>

// In development:
// <script src="/js/main-abc123.js"></script>
```

## Cache Busting Strategy

All assets use content hashing:

```bash
# Vite config: entryFileNames: 'js/[name]-[hash].js'
# If content changes → hash changes → new filename
# Old cached version never conflicts
```

## Security Headers

Add these headers to all CDN responses:

```bash
X-Content-Type-Options: nosniff
X-Frame-Options: SAMEORIGIN
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'
```

## Performance Optimization

### 1. Enable Compression

- Gzip (default)
- Brotli (for modern browsers)
- Both providers support automatic compression

### 2. Image Optimization

- CloudFlare Polish: Lossless or Lossy
- AWS CloudFront: Use Lambda@Edge for optimization
- Consider WebP format for modern browsers

### 3. HTTP/2 Push

- Preload critical resources
- Configured via Link headers or CDN settings

## Testing CDN Setup


### 1. Verify Asset URLs

```bash
# Check that assets point to CDN
curl -I https://cdn.example.com/assets/main-abc123.js
# Should return 200 with Cache-Control headers
```

### 2. Test Cache Headers

```bash
curl -I https://cdn.example.com/assets/main-abc123.js
# Should show: Cache-Control: public, max-age=31536000, immutable
```

### 3. Build and Deploy

```bash
# Build with CDN URL
CDN_URL=https://cdn.example.com npm run build

# Deploy dist folder to CDN origin (S3, or your origin)
# Point CDN to origin server
```

## Monitoring

### CloudFlare

- Dashboard → Analytics
- Monitor cache hit ratio, bandwidth saved
- Set up alerts for unusual patterns

### AWS CloudFront

```bash
aws cloudfront list-distributions
aws cloudwatch get-metric-statistics \
  --namespace AWS/CloudFront \
  --metric-name Requests \
  --start-time 2024-01-01 \
  --end-time 2024-01-02 \
  --period 3600
```

## Environment Configuration

### Development

```bash
# No CDN, local assets
npm run client
```

### Staging

```bash
CDN_URL=https://staging-cdn.example.com npm run build
```

### Production

```bash
CDN_URL=https://cdn.example.com npm run build
```

## Troubleshooting

### Assets Not Loading

1. Check CDN URL is correct
2. Verify CORS headers
3. Check CloudFlare/CloudFront cache status
4. Clear browser cache: Ctrl+Shift+Del

### Cache Not Working

1. Verify Page Rules are applied
2. Check cache control headers
3. Ensure TTL values are set correctly
4. Force cache purge and rebuild

### HTTPS Issues

1. Ensure SSL certificate is valid
2. Force HTTPS redirect in CDN settings
3. Check minimum TLS version (1.2+)

## Advanced: Custom CDN Integration

If using a non-standard CDN:

```javascript
// src/config/cdnConfig.js
class CDNConfig {
  getAssetUrl(path) {
    // Custom logic for your CDN
    return `https://your-cdn.com/custom-prefix${path}`;
  }
}
```

## References

- [Vite Asset Handling](https://vitejs.dev/guide/assets.html)
- [CloudFlare Docs](https://developers.cloudflare.com/)
- [AWS CloudFront Docs](https://docs.aws.amazon.com/cloudfront/)
- [HTTP Cache Headers](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control)
