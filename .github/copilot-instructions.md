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

### Critical Configuration Pattern: Missing `config/secrets`
**IMPORTANT**: All backend files import `require('../../config/secrets')` or `require('../config/secrets')` but this directory/module **DOES NOT EXIST** in the codebase. This is a **broken import pattern** that will cause runtime errors. The module is expected to export:
```javascript
{ loadSecrets, getSecret, requireSecret, getNumber, getArray, getDatabaseConfig }
```
Currently used in: `server.js`, `resolvers.js`, `auth.js`, `envValidator.js`, `email.js`, `cacheManager.js`, and 6+ other files.

**Workaround**: Create `config/secrets.js` that wraps `process.env` or refactor all imports to use `dotenv` directly. Likely intention was centralized env variable access with defaults/validation.

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
2. Create `config/secrets.js` module or refactor imports to use `dotenv` directly
3. Run database migrations (schema not provided in workspace, inferred from GraphQL types)

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

## Known Issues & Gotchas

1. **BROKEN IMPORTS**: `config/secrets` module doesn't exist - all backend files will fail at runtime
2. **Missing migrations**: Database schema must match GraphQL types in `schema.js` but no migration files exist
3. **Dual package.json**: Frontend has `package.json`, backend likely has separate one (not in workspace view)
4. **Apollo fully integrated**: Frontend uses Apollo Client with GraphQL queries (not mock data as previously documented)
5. **WebSocket port coordination**: Both frontend dev server and backend use WebSockets - ensure `VITE_WS_URL` points to backend
6. **No tests**: Zero test files - no Jest/Vitest/Cypress setup

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
