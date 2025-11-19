# Testing & Quality Strategy

AppWhistler now ships with a layered test and observability stack. This document summarises each layer and the accompanying npm scripts.

## Test pyramid

| Layer | Tooling | Command |
| --- | --- | --- |
| Unit | Jest (`tests/unit`) | `npm run test:unit` |
| Integration | Jest + Supertest + pg-mem (`tests/integration`) | `npm run test:integration` |
| End-to-end | Playwright (`tests/e2e`) | `npm run test:e2e` |
| Load | Artillery (`tests/load`) | `npm run test:load` |

All suites share a common Jest config (`jest.config.cjs`) with an 80% global coverage gate. Coverage reports write to `coverage/` and upload easily via CI.

## Database migrations

- Migrations live in `database/migrations/` as timestamped SQL files.
- Generate a new skeleton via `npm run migration:new -- <short-name>`.
- Apply or rollback with `npm run migrate` / `npm run migrate:down` (powered by `node-pg-migrate`).

## Observability hooks

- Sentry is wired into both Express (`@sentry/node`) and the Vite client (`@sentry/react`).
- Set `SENTRY_DSN` (and optional `SENTRY_TRACES_SAMPLE_RATE`) to enable request/error tracing.
- The environment validator now warns when error monitoring is disabled.

## API documentation

- `npm run docs:graphql` emits `docs/api/graphql-schema.graphql` plus a rendered Markdown twin.
- `npm run docs:rest` generates `docs/api/rest-openapi.yaml` with the current REST surface.

## Usage notes

1. Install dependencies once: `npm install` (Playwright will prompt to install browser binaries via `npx playwright install`).
2. Run the full test matrix before pushing: `npm run test:all` and `npm run test:load` (against staging or a local instance).
3. Keep migrations deterministic—prefer pure SQL and add rollback steps.
4. When adding new routes/resolvers, accompany them with unit or integration tests and regenerate the API docs.
