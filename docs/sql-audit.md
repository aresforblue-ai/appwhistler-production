# SQL Injection Audit

To keep AppWhistler compliant with the "privacy-first" mission, every database call must stay fully parameterized. We now ship an automated static check plus a lightweight manual review process:

1. **Static Guardrail** – `npm run audit:sql`
   - Scans every `*.js` file under `src/`.
   - Flags any `*.query()` call that inlines user data via template-literal interpolation, string concatenation, or tagged templates.
   - Fails the command (exit code 1) when issues are detected so CI/CD can block unsafe patches.

2. **Manual Checklist** – When adding new queries:
   - Always use `$1, $2, ...` placeholders alongside the parameter array.
   - Build dynamic WHERE/ORDER BY clauses by appending placeholder tokens only (never direct values).
   - Keep user-controlled identifiers (table, column names) behind a hard-coded allowlist.
   - Run `npm run audit:sql` and include its success output in PR comments when database code changes.

3. **Scope Reviewed (Nov 18, 2025)**
   - GraphQL resolvers (`src/backend/resolvers.js`)
   - Batch loaders (`src/backend/utils/dataLoader.js`)
   - REST endpoints and health checks (`src/backend/server.js`)
   - Scraper persistence layer (`src/scraper/ethicalScraper.js`)

No dynamic interpolation remains in direct `pool.query` calls, and the automated script will catch regressions.
