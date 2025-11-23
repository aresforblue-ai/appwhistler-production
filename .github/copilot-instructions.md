# AppWhistler Development Guide

## Project Overview

AppWhistler is a truth-first app recommender with AI-powered fact-checking. This is a **full-stack application** with:
- **Frontend**: Vite + React with Apollo Client (port 3000), minimalist glassmorphism design with dark/light modes
- **Backend**: Express + Apollo GraphQL Server (port 5000) with PostgreSQL, WebSockets, background job queues

## Architecture

### Frontend (src/)
- **Single-file React app**: All components in `src/App.jsx` (237 lines) - no component file splitting by design
- **GraphQL Integration**: Apollo Client configured in `src/apollo/client.js` with HTTP/WebSocket split links
- **State**: React hooks + localStorage for user data (`appwhistler_user`, `appwhistler_token`) and dark mode (`darkMode`)
- Entry point: `src/main.jsx` wraps `<App />` in `<ApolloProvider>`

### Backend (backend/)
- **GraphQL API**: `schema.js` (479 lines) defines types (User, App, FactCheck, Review, BlockchainTransaction)
- **Resolvers**: `resolvers.js` (1811 lines) contains all business logic - authentication, CRUD operations, fact-checking
- **Server**: `backend/server.js` (315 lines) orchestrates Express + Apollo + Socket.io + PostgreSQL pool
- **N+1 Prevention**: `utils/dataLoader.js` implements BatchLoader pattern for efficient database queries
- **Job Queues**: `queues/jobManager.js` uses BullMQ with Redis (falls back to in-memory if Redis unavailable)

### Configuration Pattern: `config/secrets`
**IMPORTANT**: Backend files import `require('../../config/secrets')` or `require('../config/secrets')` for centralized environment variable management. The module (`config/secrets.js`, 175 lines) exports:
```javascript
{ loadSecrets, getSecret, getNumber, getBoolean, getArray, getDatabaseConfig, validateSecrets }
```
- **Purpose**: Centralized env variable access with defaults, caching, and AWS Secrets Manager compatibility
- **Current**: Loads from `.env` file via `dotenv`
- **Production-ready**: Designed to swap to AWS Secrets Manager with minimal code changes
- **Features**: 5-minute cache TTL, type conversion (string/number/boolean/array), validation on startup
- **Used in**: `server.js`, `resolvers.js`, and all backend middleware/utilities

## Development Workflow

### Starting the Stack
```bash
# Frontend (port 3000)
npm run dev       # Vite dev server with HMR

# Backend (port 5000) - requires setup first
cd backend
npm install       # Separate package.json (not shown in workspace)
node server.js    # Or npm start if configured
```

**Prerequisites**:
1. PostgreSQL database running (see DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD env vars)
2. Configure `.env` file in project root (see Environment Variables section)
3. Run database initialization: `cd database && node init.js`

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

## Testing Infrastructure

### Frontend Tests (Vitest + Playwright)
- **Unit tests**: `npm test` - Vitest with jsdom environment
- **Watch mode**: `npm run test:watch` - Auto-run tests on file changes
- **Coverage**: `npm run test:coverage` - Generates coverage reports (70% threshold)
- **Test location**: `src/**/*.{test,spec}.{js,jsx}` (example: `src/App.test.jsx`)
- **E2E tests**: `npm run test:e2e` - Playwright browser tests in `e2e/` directory
- **E2E UI mode**: `npm run test:e2e:ui` - Interactive Playwright test runner
- **Setup**: `tests/setup.js` configures jsdom globals
- **Note**: Frontend unit tests (`src/App.test.jsx`) have pre-existing failures due to component import issues in test setup - not your responsibility to fix unless related to your changes

### Backend Tests (Jest)
- **Unit tests**: `cd backend && npm test` - Jest test runner (58 tests pass)
- **Watch mode**: `cd backend && npm run test:watch`
- **Coverage**: `cd backend && npm run test:coverage`
- **Test location**: `backend/tests/**/*.test.js` (validation, sanitization utilities)
- **Config**: `backend/jest.config.js`
- **Note**: One test suite (`sanitizer.test.js`) has missing dependency - install with `cd backend && npm install sanitize-html` if working on sanitization features

### Build Commands
- **Frontend build**: `npm run build` - Vite production build to `dist/`
- **Frontend preview**: `npm run preview` - Test production build locally
- **Backend**: No build step (Node.js runs directly)

### Linting
- **No linters configured**: Project does not have ESLint or Prettier setup
- Follow existing code style when making changes

## Known Issues & Gotchas

1. **No linting tools**: ESLint/Prettier not configured - follow existing code patterns
2. **Database initialization**: Must run `database/init.js` to create schema (no migration system)
3. **Dual package.json**: Frontend and backend have separate `package.json` files
4. **WebSocket port coordination**: Both frontend dev server and backend use WebSockets - ensure `VITE_WS_URL` points to backend (port 5000)
5. **Redis optional**: Background jobs fall back to in-memory queue if Redis not configured

## Troubleshooting

### Backend won't start
- Check PostgreSQL is running: `psql -U <DB_USER> -d <DB_NAME> -h <DB_HOST>`
- Verify `.env` file exists in project root with required variables
- Check `config/secrets.js` validation: it will throw error on startup if required secrets missing
- Common missing vars: `JWT_SECRET`, `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`

### Frontend can't connect to backend
- Confirm backend is on port 5000: `curl http://localhost:5000/health`
- Check CORS: `ALLOWED_ORIGINS` must include `http://localhost:3000`
- Apollo DevTools: Check Network tab for GraphQL requests/responses

### Job queue failures
- Redis optional: If `REDIS_URL` not set, jobs run in-memory (dev mode)
- Check worker registration: `registerWorker(queueName, handler)` must be called before adding jobs

## Best Practices for AI Assistants

### Learning the Codebase
When working on this repository, use the `store_memory` tool to save important patterns for future sessions:
- **Coding conventions**: Single-file React components, parameterized SQL queries, GraphQL error formatting
- **Build commands**: Verified working build/test commands after first successful run
- **Common patterns**: Authentication flow, DataLoader usage, job queue patterns
- **Gotchas**: Things that are non-obvious and could cause bugs (e.g., Redis fallback behavior)

Examples of good facts to store:
- "Always use parameterized queries like `pool.query('SELECT * FROM users WHERE id = $1', [userId])` to prevent SQL injection"
- "Frontend build: `npm run build`, Backend tests: `cd backend && npm test`, E2E tests: `npm run test:e2e`"
- "Use `createGraphQLError(message, code)` from `utils/errorHandler.js` for consistent GraphQL error responses"

### Making Changes
1. **Test first**: Run existing tests to understand baseline behavior
2. **Minimal changes**: Modify only what's necessary to fix the issue
3. **Test incrementally**: Build and test after each logical change
4. **Document patterns**: Store new conventions learned during development
5. **Check security**: Use `gh-advisory-database` for dependency changes

### Testing Strategy
1. Run frontend tests: `npm test` (should complete in ~10 seconds)
2. Run backend tests: `cd backend && npm test` (validates utilities)
3. Run E2E tests: `npm run test:e2e` (full integration, slower)
4. Before committing: `npm run build` to verify production build works
