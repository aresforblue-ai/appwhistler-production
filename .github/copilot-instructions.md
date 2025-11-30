# AppWhistler Copilot Instructions

Privacy-first app intelligence routing queries through Express + Apollo GraphQL → PostgreSQL → HuggingFace AI + Ethereum proofs, with Socket.io for live fact-checks.

## Architecture & Data Flow
```
React/Vite (src/frontend) → /graphql (ApolloServer) → context.pool (pg.Pool) → AI/Blockchain helpers
                         ↘ /api/v1/* (REST routes)  ↗
                           Socket.io rooms factchecks:*
```

**Key entry points:**
- `src/backend/server.js` — wires helmet, cors, rate-limit, env validation, batch loaders, background job queues
- `src/backend/resolvers.js` — all GraphQL business logic; always uses `context.pool` + dataloaders
- `src/backend/schema.js` — GraphQL types with relay-style pagination (`AppConnection`/`FactCheckConnection`)

## Commands
| Task | Command |
|------|---------|
| Full stack dev | `npm run dev` |
| Backend only | `npm run server` |
| Frontend only | `npm run client` |
| Scraper | `npm run scrape` |
| Unit tests | `npm run test:unit` |
| Integration tests | `npm run test:integration` |
| E2E (Playwright) | `npm run test:e2e` |
| SQL injection audit | `npm run audit:sql` |
| Generate API docs | `npm run docs:graphql` / `npm run docs:rest` |
| DB migrations | `npm run migrate` / `npm run migrate:down` |
| Deploy contract | `npm run deploy:contract` |

## Backend Patterns

### Resolvers (src/backend/resolvers.js)
```javascript
// Always validate input first
const emailCheck = validateEmail(input.email);
if (!emailCheck.valid) throw createGraphQLError(emailCheck.message, 'VALIDATION_ERROR');

// Auth check for protected mutations
const { userId } = requireAuth(context);

// Role check for admin/mod routes
const { userId, role } = await requireRole(context, ['admin', 'moderator']);

// Use parameterized queries only
const result = await context.pool.query('SELECT * FROM users WHERE id = $1', [userId]);
```

### Error Handling (src/backend/utils/errorHandler.js)
Use `createGraphQLError(message, CODE)` with standardized codes: `UNAUTHENTICATED`, `VALIDATION_ERROR`, `NOT_FOUND`, `FORBIDDEN`, `DATABASE_ERROR`, `AI_SERVICE_ERROR`. Apollo's formatError attaches HTTP status codes automatically.

### Input Validation (src/backend/utils/validation.js)
Import validators: `validateEmail`, `validatePassword`, `validateUsername`, `validateRating`, `validateTextLength`, `validateUrl`, `validateVote`. Each returns `{ valid: boolean, message?: string }`.

### Batch Loading
Use `context.loaders.userLoader.load(userId)` instead of direct queries for N+1 prevention. Loaders defined in `src/backend/utils/dataLoader.js`.

## AI Integration (src/ai/)

### Fact Checking (factChecker.js)
```javascript
// Cache key pattern: `${category}:${claim}` — auto-expires in 1 hour
const result = await factChecker.verifyClaimComprehensive(claim, 'apps');
// Returns: { verdict, confidence, sources, explanation }
// Verdicts: TRUE, FALSE, MISLEADING, UNVERIFIED, ERROR
```

Multi-language claims are auto-translated via `languageDetection.js`. Results combine HuggingFace NLP, Google Fact Check API, and sentiment analysis.

## Blockchain (src/blockchain/blockchain.js)
```javascript
// Always guard blockchain calls
if (!getSecret('INFURA_PROJECT_ID') && !getSecret('ALCHEMY_API_KEY')) {
  console.warn('Blockchain features disabled');
  return;
}
```
Fact-check hashes stored in `fact_checks.blockchain_hash`. Network defaults to Goerli testnet.

## Scraper Ethics (src/scraper/ethicalScraper.js)
- Always checks robots.txt before scraping
- Per-domain rate limit: `SCRAPER_RATE_LIMIT_MS` (default 2000ms)
- User-Agent: `AppWhistlerBot/1.0 (+https://appwhistler.org/bot)`

## Frontend (src/frontend/)
- Vite + React 18 + Tailwind
- API base: `VITE_API_URL` or `http://localhost:5000`
- LocalStorage keys: `appwhistler_darkmode`, `appwhistler_user`
- Style guide: glassmorphism cards, neon gradients on dark backgrounds

## Testing
- **Unit tests** (`tests/unit/`): Jest with mocked DB via `pg-mem`, no Docker needed
- **Integration tests** (`tests/integration/`): real resolver logic, mocked external services
- **E2E** (`tests/e2e/`): Playwright with backend request interception
- Coverage gate: 75% lines/functions, 60% branches

Mock pattern example (`tests/unit/ai/factChecker.test.js`):
```javascript
jest.mock('@huggingface/inference', () => ({
  HfInference: jest.fn().mockImplementation(() => ({
    zeroShotClassification: jest.fn().mockResolvedValue({ labels: ['true'], scores: [0.9] })
  }))
}));
```

## Environment Variables
**Required:** `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `JWT_SECRET`  
**Optional:** `HUGGINGFACE_API_KEY`, `INFURA_PROJECT_ID`/`ALCHEMY_API_KEY`, `SENTRY_DSN`, `ALLOWED_ORIGINS`  
**Security:** `PASSWORD_RESET_TOKEN_TTL_MIN` (30), `LOGIN_MAX_FAILED_ATTEMPTS` (5), `LOGIN_LOCKOUT_MINUTES` (15)

Secrets loaded via `src/config/secrets.js` — use `getSecret(key, fallback)` or `requireSecret(key)` (throws if missing).

## SQL Guidelines
- Always use parameterized queries (`$1`, `$2`, ...)
- UUIDs for PKs, server-side timestamps
- JSONB for flexible data (`fact_checks.sources`, `users.preferences`)
- Run `npm run audit:sql` before commits to catch string interpolation
