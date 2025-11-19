# Security Headers Audit

- Helmet now enforces:
  - **CSP (production only):** `default-src 'self'`, with tight allowances for scripts, styles, images, fonts, and WebSocket connections matching `ALLOWED_ORIGINS`.
  - **HSTS:** 1-year max-age with preload + subdomains.
  - **Frameguard:** `DENY`.
  - **Referrer-Policy:** `no-referrer`.
  - **Cross-Origin Embedder Policy:** disabled for compatibility with Socket.io, but `permittedCrossDomainPolicies` locked to `none`.
- Ensure `ALLOWED_ORIGINS` reflects every UI hostname to avoid CSP violations.
- When adding third-party assets, update the CSP directives cautiously—prefer backend proxies over widening the policy.
