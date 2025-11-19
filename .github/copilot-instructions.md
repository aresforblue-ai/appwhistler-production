npm run server
npm run client
npm run scrape
# AppWhistler Copilot Instructions

- Mission: privacy-first app intelligence that routes every query through Express + Apollo GraphQL, PostgreSQL, HuggingFace AI, and Ethereum proofs.
- Data path: `React frontend → /graphql (ApolloServer) → pg.Pool (context.pool) → AI/Blockchain helpers` with Socket.io broadcasts for live fact-checks.

## Architecture snapshot
- `src/backend/server.js` wires helmet, cors, express-rate-limit, env validation (`utils/envValidator.js`), batch loaders (`utils/dataLoader.js`), and exposes both GraphQL + `/api/v1/apps/trending` REST + WebSocket rooms `factchecks:*`.
- Resolvers (`src/backend/resolvers.js`) always use `context.pool` + dataloaders, validate input via `utils/validation.js`, and raise errors with `utils/errorHandler.js` so clients get GraphQL extension codes.
- `src/ai/factChecker.js` fuses HuggingFace inference, Google Fact Check lookup, and sentiment heuristics; cache hits short-circuit heavy calls.
- `src/blockchain/blockchain.js` bootstraps an ethers provider (Infura/Alchemy) and optional signer to stamp fact-checks on Goerli; guard all calls if RPC creds missing.
- `src/scraper/ethicalScraper.js` enforces robots.txt, per-domain rate limiting, and AppWhistlerBot UA before persisting data via pg.

## Daily workflows
- `npm run dev` launches nodemon backend + CRA frontend; use `npm run server` / `npm run client` for single side work.
- `npm run scrape` spins up Puppeteer headless with the ethics guardrails; throttle via `SCRAPER_RATE_LIMIT_MS`.
- `npm run test` executes Jest across backend logic; db access is mocked so no docker compose required.
- Schema/database: run `psql -U postgres -d appwhistler -f database/schema.sql`, then restart server (it pings `SELECT NOW()` on boot).
- Contracts: `npm run deploy:contract` (Hardhat) respects `NETWORK`, `INFURA_PROJECT_ID`/`ALCHEMY_API_KEY`, and optional `PRIVATE_KEY`.

## Backend conventions
- GraphQL schema (`schema.js`) defines pagination via `AppConnection`/`FactCheckConnection`; resolvers must return `edges + pageInfo` objects.
- Authorization: call `requireAuth(context)` before any mutation touching user data; tokens are 7-day JWTs and middleware stores the decoded payload on `req.user`.
- SQL rules: parameterize everything (`$1...`), rely on UUID PKs, prefer server-side timestamps, and serialize JSON via `JSON.stringify` before inserts.
- Error shape: throw `createGraphQLError(message, CODE)` so Apollo `formatError` can attach `statusCode`; REST routes should reuse `formatErrorResponse` for parity.

## AI, blockchain, and signals
- Fact checks blend NLP verdicts, external sources, and sentiment flags (`hasEmotionalTriggers`) before writing to `fact_checks.sources` JSONB; cache keys are `${category}:${claim}`.
- Real-time: call `global.broadcastFactCheck(category, factCheck)` from resolvers to push Socket.io `new-factcheck` events to subscribed clients.
- Blockchain hashes (if provider ready) live in `fact_checks.blockchain_hash`; always check `process.env.INFURA_PROJECT_ID || ALCHEMY_API_KEY` before invoking ethers.

## Frontend + UX cues
- `src/frontend/App.jsx` keeps dark mode + session in localStorage (`appwhistler_darkmode`, `appwhistler_user`) and flips between discover/factcheck/profile tabs; data wiring expects GraphQL endpoints at `http://localhost:5000/graphql`.
- Tailwind classes live in `src/frontend/App.css`; keep new components stylistically aligned (neon gradients + glassmorphism cards).

## Key files & env sanity
- Environment enforcement happens on boot via `validateEnvironment()`; missing `JWT_SECRET`/DB creds exit early while optional RPC keys only warn.
- Critical directories: backend (GraphQL/API), `src/ai`, `src/blockchain`, `src/scraper`, `src/frontend`, `database/schema.sql`, `tests` (Jest specs).
- Minimal `.env` sample: `DB_*`, `JWT_SECRET`, `HUGGINGFACE_API_KEY`, `INFURA_PROJECT_ID` or `ALCHEMY_API_KEY`, `NETWORK`, optional `PRIVATE_KEY`, plus `ALLOWED_ORIGINS` for CORS.

Questions or unclear bits? Let me know which subsystem (API, AI, scraper, blockchain, or frontend) needs deeper notes and I’ll extend this guide.
