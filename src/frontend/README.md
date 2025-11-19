# AppWhistler Frontend (Vite + Tailwind)

The AppWhistler client is a Vite-powered React experience that mirrors the glassmorphism aesthetic of the product brief while wiring directly into the Express + Apollo backend. It ships with Tailwind CSS, dark-mode persistence, and ready hooks for the GraphQL + REST combo used by the backend.

## Quick start

1. Install the root dependencies (backend, shared scripts): `npm install`
2. Install the frontend dependencies: `cd src/frontend && npm install`
3. Launch the full stack in watch mode: `npm run dev`
   - or only the client: `npm run client` (from the repo root) or `cd src/frontend && npm start`
4. Build production assets: `npm run build` (root) or `cd src/frontend && npm run build`
5. Preview the production build locally: `cd src/frontend && npm run preview`

> **Tip:** When you rely on the root `npm run client` script it will automatically forward stdout/stderr from the nested Vite process, so you still have access to Vite's hot-module reload logs.

## Script reference

| Where to run | Command | Purpose |
| --- | --- | --- |
| repo root | `npm run dev` | Runs backend via Nodemon + frontend via Vite concurrently |
| repo root | `npm run client` | Runs only the Vite development server (`src/frontend`) |
| repo root | `npm run build` | Builds the frontend (Vite) into `src/frontend/dist` |
| `src/frontend` | `npm start` or `npm run dev` | Runs the Vite dev server on port 3000 |
| `src/frontend` | `npm run build` | Generates the production bundle |
| `src/frontend` | `npm run preview` | Serves the previously built bundle for smoke testing |

## Environment variables

Create `src/frontend/.env` (already gitignored) with the variables below. Vite exposes only keys prefixed with `VITE_`, but the app also falls back to CRA-style `REACT_APP_` names so local scripts continue to work from older setups.

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `VITE_API_URL` (or `REACT_APP_API_URL`) | Yes | `http://localhost:5000` | Base URL for the Express/Apollo backend. Used for REST fallbacks like `/api/v1/apps/trending` and upcoming GraphQL queries. |
| `VITE_GRAPHQL_URL` *(planned)* | No | `http://localhost:5000/graphql` | Optional override for Apollo client configuration once real GraphQL wiring lands. |

Example:

```
VITE_API_URL=http://localhost:5000
```

## Feature map

| Surface | Highlights |
| --- | --- |
| Header | AW badge, mission copy, dark-mode toggle, auth modal scaffold that writes `appwhistler_user` to `localStorage` |
| Hero | Neon gradients, KPI tiles, CTA buttons, hero list (`HERO_FEATURES`) |
| Navigation | Discover / Fact Checks / Profile tabs with helper text and icons |
| Discover tab | Search input with 500ms debounce, filter chips, metric cards, and app cards fed by `/api/v1/apps/trending` |
| Fact Check tab | Timeline UI fed by `factChecks` state (seeded by `DEFAULT_FACT_CHECKS` until backend wiring lands) |
| Profile tab | Badge grid, streak info, mission control copy, uses `localStorage` user context |
| Footer | Product statement, contact CTA, and social blocks |

## Data flow

1. User toggles filters or enters a query.
2. `App.jsx` calls the backend via `fetch(\`${API_BASE_URL}/api/v1/apps/trending?search=${query}\`)` once the debounce timer fires.
3. The Express server proxies into PostgreSQL and caches results through the existing resolvers.
4. Responses update `apps` state, which flows to `DiscoverTab` and its cards.
5. Local state persists between sessions using `localStorage` keys `appwhistler_darkmode` and `appwhistler_user`.

## Styling

- Tailwind is configured via `tailwind.config.js` and PostCSS, with the primary palette defined in `App.css` and utility classes inlined inside JSX.
- Glassmorphism layers are achieved with gradient backgrounds, border blur, and drop shadows already included in the components.
- Dark mode is applied by toggling a `dark` class on `<body>`; feel free to extend with Tailwind's `dark:` variants.

## Next steps

- Wire the fact-check tab to the `/graphql` endpoint (AppConnection + FactCheckConnection queries).
- Replace the placeholder auth modal with the real JWT-based flow from `src/backend/middleware/auth.js`.
- Add Playwright smoke tests around the three primary tabs once the backend endpoints stabilize.
