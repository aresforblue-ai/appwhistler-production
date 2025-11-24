# AppWhistler Development Guide

## Project Overview

AppWhistler is a truth-first app recommender with AI-powered fact-checking. This is a **full-stack application** with:
- **Frontend**: Vite + React with Apollo Client (port 3000), glassmorphism design with dark/light modes
- **Backend**: Express + Apollo GraphQL Server (port 5000) with PostgreSQL, WebSockets, background job queues
- **Brand Protection**: Comprehensive CLA, trademark monitoring, and fork detection system (see `CLA.md`, `BRAND_PROTECTION.md`)

## Architecture

### Frontend (src/)
- **Component Structure**: Mix of monolithic and modular
  - Main app logic in `src/App.jsx` with Apollo integration
  - Reusable components in `src/components/`: `AppCard.jsx`, `AppCardSkeleton.jsx`, `AppIcon.jsx`
- **GraphQL Integration**: Apollo Client in `src/apollo/client.js` with HTTP/WebSocket split links
- **State**: React hooks + localStorage for auth (`appwhistler_user`, `appwhistler_token`) and UI (`darkMode`)
- **Entry Point**: `src/main.jsx` wraps `<App />` in `<ApolloProvider>`
- **Testing**: Vitest + React Testing Library + Playwright (see `vitest.config.js`, `playwright.config.js`)

### Backend (backend/)
- **Modular Resolvers**: Split by domain in `backend/resolvers/` directory:
  - `auth.js` - Authentication (login, register, OAuth)
  - `apps.js` - App CRUD and search operations
  - `users.js` - User profiles and management
  - `factChecks.js` - Fact-checking operations
  - `reviews.js` - Review CRUD
  - `admin.js` - Admin-only operations
  - `bounties.js` - Bounty/reward system
  - `blockchain.js` - Blockchain verification
  - `index.js` - Merges all resolvers into single export
- **GraphQL Schema**: `schema.js` defines types (User, App, FactCheck, Review, Bounty, BlockchainTransaction)
- **Server**: `backend/server.js` (331 lines) orchestrates Express + Apollo + Socket.io + PostgreSQL pool
- **N+1 Prevention**: `utils/dataLoader.js` implements DataLoader pattern for batch queries
- **Job Queues**: `queues/jobManager.js` uses Bull with Redis (in-memory fallback)
- **Database**: PostgreSQL with GIN full-text search indexes (see `database/schema.sql`)

### Configuration: `config/secrets.js`
Centralized environment variable management with AWS-ready architecture:
```javascript
const { loadSecrets, getSecret, getNumber, getArray, getDatabaseConfig } = require('../config/secrets');
```
**Pattern**: Wraps `process.env` with defaults, type coercion, validation. Currently uses `.env` file with comments showing AWS Secrets Manager migration path. All backend files use this module - never access `process.env` directly.

## Development Workflow

### Starting the Stack
```bash
# Frontend (port 3000) - from root directory
npm run dev       # Vite dev server with HMR

# Backend (port 5000) - in separate terminal
cd backend
npm start         # Production mode (node server.js)
npm run dev       # Dev mode with nodemon (auto-reload)
```

**Prerequisites**:
1. PostgreSQL running (or SQLite for dev - falls back automatically)
2. Database initialized: `cd database && node init.js` (creates schema + seed data)
3. `.env` file configured (copy from `.env.example` or see Environment Variables section)
4. Dependencies installed: `npm install` in root AND `cd backend && npm install`

### Environment Variables
Frontend (Vite - prefix with `VITE_`):
- `VITE_API_URL` - Backend URL (default: `http://localhost:5000`)
- `VITE_WS_URL` - WebSocket URL (default: `ws://localhost:5000`)
- `VITE_SENTRY_DSN` - Optional Sentry monitoring
- `VITE_SENTRY_TRACES_SAMPLE_RATE` - Sentry trace sampling

Backend (Node.js):
- **Required**: `JWT_SECRET`, `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `NODE_ENV`
- **Recommended**: `HUGGINGFACE_API_KEY` (AI fact-checking), `SENDGRID_API_KEY` (emails), `REDIS_URL` (job queues)
- **Optional**: `SENTRY_DSN`, `INFURA_PROJECT_ID`/`ALCHEMY_API_KEY` (blockchain), `PINATA_API_KEY`/`PINATA_SECRET_KEY` (IPFS)
- **Security**: `ALLOWED_ORIGINS` (comma-separated CORS origins), `PORT` (default: 5000)

Validation on startup: `backend/utils/envValidator.js` checks required vars, prints warnings for missing recommended vars.

## Key Patterns & Conventions

### Authentication Flow
1. User logs in via GraphQL `login` mutation (email/password) → `resolvers.js` validates credentials
2. Backend generates JWT with `generateToken(userId)` using `JWT_SECRET`
3. Token stored in `localStorage.getItem('appwhistler_token')`
4. Apollo Client's `authLink` adds `Authorization: Bearer ${token}` header to all requests
5. Backend middleware `authenticateToken` (from `middleware/auth.js`) verifies token, attaches `req.user` to context
6. GraphQL context includes `{ pool, req, loaders, user: req.user }` for all resolvers

### Database Access
- Connection pool: `const pool = new Pool(getDatabaseConfig())` in `server.js`
- Pool monitoring: `utils/poolMonitor.js` tracks connection health (check `/health/db-pool`)
- Use DataLoaders: Access via `context.loaders` in resolvers to batch queries (e.g., `loaders.userById.load(userId)`)
- **Never** construct raw SQL with string interpolation - use parameterized queries: `pool.query('SELECT * FROM users WHERE id = $1', [userId])`

### GraphQL Complexity & Rate Limiting
- Complexity plugin: `middleware/graphqlComplexity.js` limits query depth/cost to prevent abuse
- Rate limiter: `middleware/rateLimiter.js` uses tiered limits (per user if authenticated, per IP otherwise)
- Applied to `/graphql` and `/api/` routes via `perUserRateLimiter` middleware

### Background Jobs
Job types registered in `server.js`:
- `email-jobs` → `handleEmailJob` (password resets, welcome emails)
- `blockchain-jobs` → `handleBlockchainJob` (write fact-checks to chain)
- `fact-check-jobs` → `handleFactCheckJob` (async AI processing)

Add jobs: `jobManager.addJob('email', { to, subject, body })` from resolvers

### Real-Time Updates
WebSocket setup in `server.js`:
- Socket.io server on same port as HTTP
- Clients subscribe: `socket.emit('subscribe:factchecks', category)`
- Broadcast from resolvers: `global.broadcastFactCheck(category, data)`

Apollo Client uses GraphQL subscriptions via `GraphQLWsLink` for real-time queries.

## Frontend Design System

### Glassmorphism UI
- Colors: Blue/Indigo gradients (`from-blue-500 to-indigo-500`), Cyan/Emerald accents
- Dark mode: Toggle via `setDarkMode` → updates `localStorage.darkMode` + `document.documentElement.classList.toggle('dark')`
- Effects: `backdrop-blur-xl`, `rounded-2xl`/`rounded-3xl` borders, `shadow-lg shadow-blue-500/30` glows
- All components accept `darkMode` prop for theme-aware conditional classes

### Component Guidelines
1. Define at module scope in `App.jsx` (no nesting, no separate files)
2. PascalCase for components, camelCase for utilities
3. Use Tailwind variants: `${darkMode ? 'bg-slate-950' : 'bg-white'}`

## API Endpoints

REST (legacy/quick actions):
- `GET /api/v1/apps/trending` - Top 10 verified apps
- `GET /health` - Server + DB health check
- `GET /health/db-pool` - Detailed pool diagnostics
- `POST /api/v1/privacy/*` - GDPR/CCPA compliance endpoints (see `routes/privacy.js`)
- `POST /api/v1/upload/*` - File uploads (see `routes/upload.js`)
- `GET /api/v1/brand-monitoring/scan` - Trigger fork detection scan

GraphQL:
- `POST /graphql` - All queries/mutations (introspection disabled in production)
- WebSocket subscriptions via `/graphql` (GraphQLWsLink)

## Security & Error Handling

### Middleware Chain (in order)
1. Helmet (CSP, HSTS, frameguard) - `helmet()` with custom CSP directives
2. CORS - Validates origin against `ALLOWED_ORIGINS` env var
3. Body parsers - 10mb limit on JSON/urlencoded
4. `authenticateToken` - Populates `req.user` if valid JWT (doesn't block anonymous requests)
5. `perUserRateLimiter` - Tiered rate limits
6. Route handlers
7. Sentry error handler (if `SENTRY_DSN` set)
8. 404 handler
9. Global error handler (logs + returns 500)

### Input Validation & Sanitization
- **Validation**: `utils/validation.js` exports validators (e.g., `validateEmail`, `validatePassword`, `validateRating`)
- **Sanitization**: `utils/sanitizer.js` exports `sanitizePlainText`, `sanitizeRichText`, `sanitizeJson`
- **Pattern**: Validate inputs in resolvers before DB operations, sanitize user-generated content before storage

### Error Patterns
- Use `createGraphQLError(message, code)` from `utils/errorHandler.js` for consistent error formatting
- Wrap DB operations in `safeDatabaseOperation(fn)` for automatic error handling
- Sentry captures exceptions if DSN configured

## Testing

### Frontend Tests (Vitest)
```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report (70% threshold)
npm run test:ui       # Visual test UI
```
**Setup**: `vitest.config.js` configured with jsdom, React Testing Library in `tests/setup.js`

### Backend Tests (Jest)
```bash
cd backend
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```
**Setup**: `backend/jest.config.js`, tests in `backend/tests/`

### E2E Tests (Playwright)
```bash
npm run test:e2e        # Run E2E tests
npm run test:e2e:ui     # UI mode
npm run test:e2e:debug  # Debug mode
```
**Setup**: `playwright.config.js`, tests in `e2e/`

### Test Files
- `backend/tests/utils/sanitizer.test.js` - Input sanitization tests
- `backend/tests/utils/validation.test.js` - Input validation tests
- `src/App.test.jsx` - Frontend component tests
- `e2e/app.spec.js` - End-to-end user flow tests

## Brand Protection System

**Critical for Contributors**: AppWhistler has a comprehensive brand protection system that all contributors and forks must respect.

### Key Files
- `CLA.md` - Contributor License Agreement (MUST read before contributing)
- `BRAND_PROTECTION.md` - Complete brand protection guide
- `ASSETS_LICENSE.md` - Design assets licensed under CC BY-NC 4.0
- `DMCA_TEMPLATE.md` - Enforcement procedures for violations

### Brand Monitoring Features
- **Automated Fork Detection**: `backend/utils/forkScanner.js` scans GitHub for unauthorized forks
- **Trademark Monitoring**: `backend/utils/brandMonitoring.js` monitors brand usage across web
- **Blockchain Proof**: `backend/utils/blockchainBrand.js` stores brand proofs on-chain
- **REST Endpoint**: `GET /api/v1/brand-monitoring/scan` triggers fork scan

### Fork Requirements (CLA Section 4)
If forking this project, you **MUST**:
1. Change project name (remove "AppWhistler" branding completely)
2. Replace all logos and branded assets
3. Add clear attribution to original project
4. Review `CLA.md` Section 4 for complete compliance requirements

**Enforcement**: Violations can trigger DMCA takedowns. Community bounty program rewards reporting violations.

## Code Patterns & Best Practices

### Resolver Pattern
All resolvers use modular structure with error handling:
```javascript
// backend/resolvers/apps.js
const { withErrorHandling } = require('../utils/errorHandler');

module.exports = {
  Query: {
    apps: withErrorHandling(async (_, { filters }, { pool, user }) => {
      // Use parameterized queries ALWAYS
      const result = await pool.query(
        'SELECT * FROM apps WHERE category = $1',
        [filters.category]
      );
      return result.rows;
    }),
  },
};
```

### Caching Strategy
Use `cacheManager` for expensive queries:
```javascript
const cacheManager = require('../utils/cacheManager');

// Generate cache key from query parameters
const cacheKey = cacheManager.constructor.generateKey('apps:filtered', {
  category, platform, minTruthRating, limit
});

// Try cache first
const cached = await cacheManager.get(cacheKey);
if (cached) return cached;

// Query DB and cache result
const result = await pool.query(/* ... */);
await cacheManager.set(cacheKey, result.rows, 300); // 5 min TTL
```

### Frontend Component Guidelines
1. Define reusable components in `src/components/` directory
2. Use lazy loading for large components: `const AppCard = lazy(() => import('./components/AppCard'))`
3. All components accept `darkMode` prop for theme consistency
4. Use Tailwind utility classes with dark mode variants: `className="bg-white dark:bg-slate-900"`

### Database Query Optimization
- Always use DataLoader for foreign key lookups: `context.loaders.userById.load(userId)`
- Leverage composite indexes defined in `database/schema.sql`
- Full-text search uses PostgreSQL GIN indexes: `to_tsvector('english', name)`
- Check query plans with `EXPLAIN ANALYZE` for slow queries

## Known Issues & Gotchas

1. **Dual package.json**: Frontend and backend have separate `package.json` files - install deps in both directories
2. **WebSocket port coordination**: Frontend connects to backend WebSocket - ensure `VITE_WS_URL=ws://localhost:5000` in frontend `.env`
3. **Database fallback**: Automatically falls back from PostgreSQL to SQLite if PG unavailable (dev convenience)
4. **Redis optional**: Job queues use in-memory fallback if Redis not available (background jobs still work)
5. **GIN indexes**: Full-text search indexes use PostgreSQL-specific GIN indexes (won't work with SQLite)
6. **Brand protection**: If forking, MUST comply with `CLA.md` Section 4 (rebrand, attribution, no trademark use)

## Troubleshooting

### Backend won't start
- Check PostgreSQL is running: `psql -U <DB_USER> -d <DB_NAME> -h <DB_HOST>`
- Verify `config/secrets.js` exists or refactor to use `dotenv`
- Run `backend/utils/envValidator.js` standalone to check config

### Frontend can't connect to backend
- Confirm backend is on port 5000: `curl http://localhost:5000/health`
- Check CORS: `ALLOWED_ORIGINS` must include `http://localhost:3000`
- Apollo DevTools: Check Network tab for GraphQL requests/responses

### Job queue failures
- Redis optional: If `REDIS_URL` not set, jobs run in-memory (dev mode)
- Check worker registration: `registerWorker(queueName, handler)` must be called before adding jobs
