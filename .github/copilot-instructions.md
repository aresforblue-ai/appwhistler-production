# AppWhistler Development Guide

## Project Overview

AppWhistler is a truth-first app recommender with AI-powered fact-checking. This is a **single-file React application** (`src/App.jsx`) built with Vite, featuring a minimalist glassmorphism design with dark/light modes.

## Architecture

### Monolithic Component Structure
- **All components live in `src/App.jsx`** (849 lines) - Header, Navigation, HeroSection, DiscoverTab, FactCheckTab, ProfileTab, AppCard, AuthModal, Footer
- Components are defined as functions at module scope, not nested
- State management uses React hooks with localStorage persistence for user data and dark mode

### Key State Patterns
```javascript
// User persistence via localStorage keys:
localStorage.getItem('appwhistler_user')        // JSON: { username, truthScore }
localStorage.getItem('appwhistler_darkmode')   // String: 'true' | 'false'
```

### API Integration
- Backend URL from env: `VITE_API_URL` (defaults to `http://localhost:5000`)
- Single endpoint used: `GET /api/v1/apps/trending?search=${query}`
- Expected response: `{ success: boolean, data: [...apps] }`
- No authentication on API calls yet

## Tech Stack & Build

- **Runtime**: Vite 5.x with HMR (`import.meta.hot`)
- **Styling**: Tailwind CSS with custom utilities in `src/index.css` and component styles in `src/App.css`
- **Fonts**: Space Grotesk (display), Inter (body) - referenced in `tailwind.config.js`
- **Monitoring**: Sentry with env vars `VITE_SENTRY_DSN` and `VITE_SENTRY_TRACES_SAMPLE_RATE`

### Commands
```bash
npm run dev       # Start dev server on port 3000 (host 0.0.0.0)
npm run build     # Production build with manual chunks (vendor, apollo)
npm run preview   # Preview production build
```

### CDN & Asset Strategy
- `vite.config.js` supports `CDN_URL` env var for asset base path
- Output structure: `js/`, `css/`, `images/`, `fonts/` directories with content hashing
- Manual chunks split `react`/`react-dom`/`react-router-dom` into `vendor`, Apollo GraphQL into `apollo` (though Apollo not yet imported)

## Design System

### Color Palette
- Primary: Blue (59 130 246) / Indigo (99 102 241) gradients
- Accent: Cyan (34 211 238), Emerald (34 197 94)
- Dark mode: Slate-950 background, Slate-900 secondary
- Glassmorphism: `backdrop-blur-xl`, opacity-based overlays

### Component Conventions
- All interactive elements use `rounded-2xl` or `rounded-3xl` borders
- Gradient backgrounds: `from-blue-500 to-indigo-500` pattern throughout
- Dark mode toggled via `.dark` class on `<body>`, checked in components with ternary expressions
- Shadow styles: `shadow-lg shadow-blue-500/30` for neon effects

## Development Patterns

### Adding New Components
1. Define function component at module scope in `App.jsx` (after existing components)
2. Follow naming: PascalCase for components, camelCase for utilities
3. Accept `darkMode` prop for theme-aware styling
4. Use Tailwind classes with dark mode variants: `${darkMode ? 'bg-slate-950' : 'bg-white'}`

### State & Side Effects
- Search uses 500ms debounce via `useEffect` cleanup pattern
- Dark mode syncs to body class and localStorage on every toggle
- User data fetched from localStorage on mount, persisted on login

### Error Handling
- Global error handlers in `src/main.jsx` log to console
- Sentry initialized in `App.jsx` with guard: `window.__APPWHISTLER_SENTRY__`
- API errors caught and logged, don't crash UI

## HTML Structure

### Development vs Production
- Production `index.html` is minimal (favicon: `/vite.svg`, no debug scripts)
- Development version may include debug console logging and error handlers
- Both use `<script type="module" src="/src/main.jsx">` as entry point

## Known Gotchas

- **No component file splitting**: Everything in one file by design - don't extract components to separate files without explicit intent
- **Apollo/GraphQL setup in config but not imported**: Vite config references Apollo chunks, but `@apollo/client` not in dependencies yet
- **Mock data fallbacks**: `DEFAULT_FACT_CHECKS` used when API unavailable
- **Placeholder icon**: `/placeholder-icon.png` referenced but may not exist
- **Dark mode sync**: Body class must be manually applied via `useEffect`, not automatic

## Troubleshooting

### Dev Server Issues
- Ensure all dependencies installed: `npm install`
- Check port 3000 isn't already in use
- Verify Node.js version compatibility with Vite 5.x (Node 18+)
