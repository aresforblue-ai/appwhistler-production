# AppWhistler Production - Verification Checklist

**Date**: November 21, 2025
**Branch**: claude/claude-md-mi9727wahw9sc013-01WjG7s2hah8fo3iAT8WHfh3
**Purpose**: Manual verification of all changes before production deployment

---

## 📋 Pre-Deployment Checklist

### ✅ Phase 1: Environment Setup

#### 1.1 Install Dependencies

**Frontend Dependencies**:
```bash
cd /home/user/appwhistler-production
npm install
```

**Expected Output**: All packages installed without errors

**Verification**:
- [ ] No UNMET DEPENDENCY warnings
- [ ] No vulnerability warnings (or acceptable only)
- [ ] `node_modules/` directory created
- [ ] `package-lock.json` updated

**Backend Dependencies**:
```bash
cd backend
npm install
```

**Verification**:
- [ ] All backend packages installed
- [ ] Winston, Jest, Supertest installed
- [ ] No critical vulnerabilities

**Playwright Browsers** (for E2E tests):
```bash
cd ..
npx playwright install --with-deps
```

**Verification**:
- [ ] Chromium browser downloaded
- [ ] Firefox browser downloaded
- [ ] WebKit browser downloaded
- [ ] System dependencies installed

---

#### 1.2 Environment Variables

**Check .env exists**:
```bash
ls -la .env backend/.env
```

**Required Variables** (in root `.env`):
- [ ] `VITE_API_URL` (e.g., http://localhost:5000)
- [ ] `VITE_WS_URL` (e.g., ws://localhost:5000)

**Required Variables** (in `backend/.env`):
- [ ] `NODE_ENV` (development/production/test)
- [ ] `PORT` (5000)
- [ ] `DB_HOST` (localhost or production host)
- [ ] `DB_PORT` (5432)
- [ ] `DB_NAME` (appwhistler)
- [ ] `DB_USER` (postgres)
- [ ] `DB_PASSWORD` (secure password)
- [ ] `JWT_SECRET` (strong random string, 32+ chars)

**Optional but Recommended**:
- [ ] `LOG_LEVEL` (info, debug, warn, error)
- [ ] `REDIS_URL` (for caching and job queues)
- [ ] `SENTRY_DSN` (for error tracking)

---

#### 1.3 Database Setup

**Start PostgreSQL**:
```bash
# Check if PostgreSQL is running
pg_isready -h localhost -p 5432
```

**Expected Output**: `accepting connections`

**Verification**:
- [ ] PostgreSQL service is running
- [ ] Port 5432 is accessible
- [ ] Can connect with credentials

**Initialize Database**:
```bash
cd database
node init.js
```

**Verification**:
- [ ] Database `appwhistler` created
- [ ] All tables created (users, apps, fact_checks, reviews, etc.)
- [ ] All indexes created
- [ ] Seed data inserted (if applicable)
- [ ] No errors in output

---

#### 1.4 Create Logs Directory

```bash
mkdir -p backend/logs
ls -la backend/logs
```

**Verification**:
- [ ] Directory exists
- [ ] Has write permissions
- [ ] Empty (no old logs)

---

### ✅ Phase 2: Code Verification

#### 2.1 Component Extraction

**Check new component files exist**:
```bash
ls -la src/components/
```

**Expected Files**:
- [ ] `AppCard.jsx` (~96 lines)
- [ ] `AppIcon.jsx` (~36 lines)
- [ ] `AppCardSkeleton.jsx` (~28 lines)

**Verify imports in App.jsx**:
```bash
grep -n "import.*components" src/App.jsx
```

**Expected Output**:
```javascript
import AppCardSkeleton from './components/AppCardSkeleton';
const AppCard = lazy(() => import('./components/AppCard'));
```

**Verification**:
- [ ] Components properly imported
- [ ] Lazy loading configured for AppCard
- [ ] Suspense wrapper present in JSX

---

#### 2.2 Backend Resolver Modularization

**Check resolver files exist**:
```bash
ls -la backend/resolvers/
```

**Expected Files**:
- [ ] `apps.js` (~242 lines)
- [ ] `auth.js` (~298 lines)
- [ ] `factChecks.js` (~651 lines)
- [ ] `users.js` (~250 lines)
- [ ] `helpers.js` (~82 lines)

**Verify imports in main resolvers.js**:
```bash
head -30 backend/resolvers.js | grep -E "require.*resolvers"
```

**Verification**:
- [ ] Resolver modules not imported (still using monolithic file)
- [ ] Constants properly imported
- [ ] Error handler imports correct
- [ ] Pagination constants imported

---

#### 2.3 Constants Centralization

**Check constant files**:
```bash
ls -la backend/constants/
```

**Expected Files**:
- [ ] `cacheTTL.js`
- [ ] `pagination.js`
- [ ] `rateLimits.js`

**Verify constants are used**:
```bash
grep -n "require.*constants" backend/resolvers.js backend/server.js
```

**Verification**:
- [ ] Constants imported in resolvers.js
- [ ] Constants imported in server.js
- [ ] Used instead of magic numbers

---

#### 2.4 Logger Integration

**Check logger file**:
```bash
cat backend/utils/logger.js
```

**Verification**:
- [ ] Winston properly configured
- [ ] Error log file path correct
- [ ] Combined log file path correct
- [ ] Console transport for development

**Verify logger usage** (if integrated):
```bash
grep -n "require.*logger" backend/server.js backend/resolvers.js
```

---

### ✅ Phase 3: Testing Infrastructure

#### 3.1 Frontend Tests (Vitest)

**Run frontend tests**:
```bash
npm test
```

**Expected Output**:
- Test Suites: X passed, X total
- Tests: X passed, X total
- No failures

**Verification**:
- [ ] Tests execute successfully
- [ ] Example test passes (App.test.jsx)
- [ ] No import errors
- [ ] No module resolution issues

**Run with coverage**:
```bash
npm run test:coverage
```

**Verification**:
- [ ] Coverage report generated
- [ ] Coverage thresholds visible
- [ ] HTML report in `coverage/` directory

**Try Test UI**:
```bash
npm run test:ui
```

**Verification**:
- [ ] Vitest UI opens in browser
- [ ] Can view test results
- [ ] Can re-run tests

---

#### 3.2 Backend Tests (Jest)

**Run backend tests**:
```bash
cd backend
npm test
```

**Expected Output**:
- Test Suites: X passed, X total
- Tests: X passed, X total
- Example validation test passes

**Verification**:
- [ ] Jest executes successfully
- [ ] Example test passes (validation.test.js)
- [ ] No import errors
- [ ] Database mocking works

**Run with coverage**:
```bash
npm run test:coverage
```

**Verification**:
- [ ] Coverage report generated
- [ ] HTML report in `backend/coverage/` directory

---

#### 3.3 E2E Tests (Playwright)

**Run E2E tests**:
```bash
cd ..
npm run test:e2e
```

**Prerequisites**:
- Backend server must be running
- Frontend dev server must be running

**Verification**:
- [ ] Tests execute successfully
- [ ] Example test passes (app.spec.js)
- [ ] Screenshots/videos captured (if failures)
- [ ] Test report generated

**Try E2E UI**:
```bash
npm run test:e2e:ui
```

**Verification**:
- [ ] Playwright UI opens
- [ ] Can step through tests
- [ ] Can debug failures

---

### ✅ Phase 4: Build & Development Servers

#### 4.1 Backend Server

**Start backend**:
```bash
cd backend
npm start
```

**Expected Output**:
```
🚀 Server ready at http://localhost:5000
🎯 GraphQL endpoint: http://localhost:5000/graphql
📊 Health check: http://localhost:5000/health
```

**Verification**:
- [ ] Server starts without errors
- [ ] No database connection errors
- [ ] No missing module errors
- [ ] Port 5000 listening

**Test health endpoint**:
```bash
curl http://localhost:5000/health
```

**Expected Response**:
```json
{
  "status": "ok",
  "timestamp": "...",
  "uptime": "..."
}
```

**Test database pool health**:
```bash
curl http://localhost:5000/health/db-pool
```

**Expected Response**:
```json
{
  "totalConnections": 0,
  "idleConnections": 0,
  "waitingRequests": 0
}
```

**Test GraphQL endpoint**:
```bash
curl -X POST http://localhost:5000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ __typename }"}'
```

**Expected Response**:
```json
{
  "data": {
    "__typename": "Query"
  }
}
```

**Verification Checklist**:
- [ ] Health endpoint responds
- [ ] DB pool endpoint responds
- [ ] GraphQL endpoint responds
- [ ] No errors in console
- [ ] Logs being written to `backend/logs/`

---

#### 4.2 Frontend Development Server

**Start frontend** (new terminal):
```bash
npm run dev
```

**Expected Output**:
```
VITE v6.x.x ready in xxx ms

➜  Local:   http://localhost:3000/
➜  Network: http://0.0.0.0:3000/
```

**Verification**:
- [ ] Vite server starts without errors
- [ ] No module resolution errors
- [ ] No import errors
- [ ] Port 3000 accessible

**Open in browser**: http://localhost:3000

**Visual Verification**:
- [ ] Page loads without errors
- [ ] AppWhistler header visible
- [ ] Search bar present
- [ ] Category filters visible
- [ ] App cards render
- [ ] Icons display correctly
- [ ] Dark mode toggle works
- [ ] No console errors in DevTools

---

#### 4.3 Frontend Production Build

**Build frontend**:
```bash
npm run build
```

**Expected Output**:
```
vite v6.x.x building for production...
✓ xxx modules transformed.
dist/index.html                   x.xx kB
dist/assets/index-xxxxxx.js      xxx.xx kB
✓ built in xxxs
```

**Verification**:
- [ ] Build completes successfully
- [ ] No errors or warnings (or acceptable only)
- [ ] `dist/` directory created
- [ ] `dist/index.html` exists
- [ ] `dist/assets/` contains JS/CSS bundles

**Check bundle size**:
```bash
ls -lh dist/assets/
```

**Verification**:
- [ ] Main bundle < 200KB (gzipped)
- [ ] Reasonable bundle size

**Preview production build**:
```bash
npm run preview
```

**Verification**:
- [ ] Preview server starts
- [ ] Production build works correctly
- [ ] No runtime errors

---

### ✅ Phase 5: Critical Path Testing

#### 5.1 Authentication Flow

**Manual Test**:

1. **Open app**: http://localhost:3000
   - [ ] Page loads

2. **Test login** (if implemented):
   - [ ] Login form accessible
   - [ ] Can submit credentials
   - [ ] JWT token stored in localStorage
   - [ ] User redirected after login

3. **Test authenticated requests**:
   - [ ] GraphQL requests include Authorization header
   - [ ] Protected routes accessible
   - [ ] User context available

**GraphQL Test**:
```bash
# Get JWT token (replace with actual login mutation)
curl -X POST http://localhost:5000/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { login(email: \"test@example.com\", password: \"password\") { token } }"
  }'

# Use token for authenticated request
curl -X POST http://localhost:5000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "query": "{ me { id email username } }"
  }'
```

**Verification**:
- [ ] Login mutation works
- [ ] Token generated correctly
- [ ] Authenticated queries work
- [ ] Unauthorized requests rejected

---

#### 5.2 GraphQL Queries

**Test apps query**:
```bash
curl -X POST http://localhost:5000/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "{ apps(limit: 5) { id name truthRating category } }"
  }'
```

**Expected Response**:
```json
{
  "data": {
    "apps": [
      {
        "id": "1",
        "name": "Example App",
        "truthRating": 85,
        "category": "social"
      }
    ]
  }
}
```

**Verification**:
- [ ] Query executes successfully
- [ ] Returns valid data
- [ ] No GraphQL errors

**Test app by ID**:
```bash
curl -X POST http://localhost:5000/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "{ app(id: \"1\") { id name description truthRating } }"
  }'
```

**Verification**:
- [ ] Single app query works
- [ ] DataLoader prevents N+1 queries

**Test trending apps (cached)**:
```bash
curl -X POST http://localhost:5000/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "{ trendingApps(limit: 10) { id name downloadCount } }"
  }'
```

**Verification**:
- [ ] Trending apps query works
- [ ] Results are cached (check logs)
- [ ] Cache TTL applied correctly

---

#### 5.3 Database Connections

**Check pool status**:
```bash
curl http://localhost:5000/health/db-pool
```

**After running queries, verify**:
- [ ] Active connections reasonable
- [ ] No connection leaks
- [ ] Idle connections released

**Monitor database**:
```bash
# In PostgreSQL
SELECT count(*) as active_connections
FROM pg_stat_activity
WHERE datname = 'appwhistler';
```

**Verification**:
- [ ] Connection count matches pool stats
- [ ] No excessive connections
- [ ] Connections properly managed

---

#### 5.4 Frontend Component Rendering

**Open browser DevTools**: http://localhost:3000

**Check Network tab**:
- [ ] Initial page load < 2 seconds
- [ ] JS bundle loaded
- [ ] CSS loaded
- [ ] No 404 errors

**Check React DevTools**:
- [ ] App component rendered
- [ ] AppCard lazy loaded
- [ ] Props passed correctly
- [ ] State managed properly

**Check Console**:
- [ ] No error messages
- [ ] No warning messages (or acceptable only)
- [ ] No 404s or failed requests

**Test dark mode**:
1. Click dark mode toggle
   - [ ] Theme changes
   - [ ] Preference saved to localStorage
   - [ ] Persists on page reload

**Test search**:
1. Type in search box
   - [ ] Apps filter in real-time
   - [ ] Results update immediately
   - [ ] No layout shifts

**Test category filter**:
1. Select different categories
   - [ ] Apps filter correctly
   - [ ] Counts update
   - [ ] All/reset works

---

### ✅ Phase 6: File Structure Verification

#### 6.1 New Files Checklist

**Testing Infrastructure**:
- [ ] `vitest.config.js`
- [ ] `playwright.config.js`
- [ ] `backend/jest.config.js`
- [ ] `tests/setup.js`
- [ ] `backend/tests/setup.js`
- [ ] `e2e/app.spec.js`
- [ ] `src/App.test.jsx`
- [ ] `backend/tests/utils/validation.test.js`

**Components**:
- [ ] `src/components/AppCard.jsx`
- [ ] `src/components/AppIcon.jsx`
- [ ] `src/components/AppCardSkeleton.jsx`

**Backend Structure**:
- [ ] `backend/constants/cacheTTL.js`
- [ ] `backend/constants/pagination.js`
- [ ] `backend/constants/rateLimits.js`
- [ ] `backend/utils/logger.js`
- [ ] `backend/resolvers/apps.js`
- [ ] `backend/resolvers/auth.js`
- [ ] `backend/resolvers/factChecks.js`
- [ ] `backend/resolvers/users.js`
- [ ] `backend/resolvers/helpers.js`

**Configuration**:
- [ ] `.editorconfig`
- [ ] `.gitattributes`
- [ ] `.github/workflows/test.yml`
- [ ] `backend/.env.test`

**Documentation**:
- [ ] `README.testing.md`
- [ ] `CHANGES.md`
- [ ] `VERIFICATION_CHECKLIST.md` (this file)

---

#### 6.2 Modified Files Checklist

**Core Files**:
- [ ] `package.json` (testing dependencies added)
- [ ] `backend/package.json` (winston, jest added)
- [ ] `src/App.jsx` (components extracted)
- [ ] `backend/resolvers.js` (constants imported)
- [ ] `backend/server.js` (logger integration)
- [ ] `.gitignore` (test results, logs added)

**Database**:
- [ ] `database/init.js` (error handling improved)
- [ ] `database/schema.sql` (index optimizations)

**Configuration**:
- [ ] `vite.config.js` (build optimizations)
- [ ] `src/apollo/client.js` (performance improvements)

---

### ✅ Phase 7: Windows 11 Compatibility

#### 7.1 Line Endings

**Verify EditorConfig**:
```bash
cat .editorconfig | grep "end_of_line"
```

**Expected**: `end_of_line = lf`

**Verification**:
- [ ] EditorConfig present
- [ ] LF enforced for code files
- [ ] CRLF for Windows scripts

**Verify Git Attributes**:
```bash
cat .gitattributes | grep "text="
```

**Expected**: `* text=auto eol=lf`

**Verification**:
- [ ] Git attributes present
- [ ] Auto-detect text files
- [ ] LF normalization configured

---

#### 7.2 Windows-Specific Testing

**If on Windows**:

**Check file encodings**:
```powershell
# In PowerShell
Get-Content src/App.jsx | Select-Object -First 1
```

**Verification**:
- [ ] Files readable without errors
- [ ] No encoding issues
- [ ] UTF-8 enforced

**Run tests on Windows**:
```bash
npm test
cd backend && npm test
npm run test:e2e
```

**Verification**:
- [ ] All tests pass on Windows
- [ ] No path separator issues
- [ ] No line ending issues

---

### ✅ Phase 8: CI/CD Pipeline

#### 8.1 GitHub Actions Workflow

**Check workflow file**:
```bash
cat .github/workflows/test.yml
```

**Verification**:
- [ ] Workflow file valid YAML
- [ ] 4 jobs defined (backend-tests, frontend-tests, e2e-tests, lint)
- [ ] PostgreSQL and Redis services configured
- [ ] Codecov integration present
- [ ] Artifact upload configured

**Trigger workflow** (if in GitHub repo):
1. Push to branch
2. Check Actions tab
3. Verify all jobs pass

**Verification**:
- [ ] Backend tests job passes
- [ ] Frontend tests job passes
- [ ] E2E tests job passes
- [ ] Lint job passes (if configured)
- [ ] Coverage uploaded

---

#### 8.2 Local CI Simulation

**Run all test suites locally**:

```bash
# Frontend tests
npm test

# Backend tests
cd backend && npm test && cd ..

# E2E tests (requires servers running)
npm run test:e2e
```

**Verification**:
- [ ] All test suites pass
- [ ] No flaky tests
- [ ] Coverage thresholds met (70%)

---

### ✅ Phase 9: Performance Verification

#### 9.1 Bundle Size

**Check production build size**:
```bash
npm run build
ls -lh dist/assets/
```

**Target Sizes**:
- [ ] Main JS bundle < 200KB
- [ ] Vendor bundle < 150KB
- [ ] CSS bundle < 50KB
- [ ] Total < 400KB

**Check code splitting**:
```bash
ls -la dist/assets/ | grep -E "\.js$"
```

**Verification**:
- [ ] Multiple JS chunks (code splitting working)
- [ ] AppCard in separate chunk
- [ ] Reasonable chunk sizes

---

#### 9.2 Load Time

**Open DevTools > Network tab**:

1. Hard reload (Ctrl+Shift+R)
2. Check timings

**Target Metrics**:
- [ ] DOMContentLoaded < 1 second
- [ ] Load event < 2 seconds
- [ ] First Contentful Paint < 1.5 seconds
- [ ] Time to Interactive < 3 seconds

**Lighthouse Audit**:

1. Open DevTools > Lighthouse
2. Run audit (Desktop, Performance)

**Target Scores**:
- [ ] Performance > 90
- [ ] Accessibility > 90
- [ ] Best Practices > 90
- [ ] SEO > 80

---

#### 9.3 Database Performance

**Check query performance**:

1. Enable query logging:
```javascript
// In backend code temporarily
pool.on('query', (q) => console.log(q.text));
```

2. Run GraphQL queries
3. Check for:
   - [ ] No N+1 queries (DataLoader working)
   - [ ] Parameterized queries only
   - [ ] Indexes being used

**Monitor pool**:
```bash
# Make many requests
for i in {1..100}; do
  curl -s http://localhost:5000/graphql \
    -H "Content-Type: application/json" \
    -d '{"query": "{ apps(limit: 5) { id } }"}' > /dev/null
done

# Check pool health
curl http://localhost:5000/health/db-pool
```

**Verification**:
- [ ] No connection exhaustion
- [ ] Connections properly released
- [ ] Response time < 200ms

---

### ✅ Phase 10: Security Verification

#### 10.1 Dependencies

**Check for vulnerabilities**:
```bash
npm audit
cd backend && npm audit
```

**Verification**:
- [ ] No critical vulnerabilities
- [ ] No high vulnerabilities (or acceptable with mitigation)
- [ ] Dependencies up to date

**Fix if needed**:
```bash
npm audit fix
cd backend && npm audit fix
```

---

#### 10.2 Environment Variables

**Check secrets not committed**:
```bash
git status
git diff | grep -E "(JWT_SECRET|PASSWORD|API_KEY)"
```

**Verification**:
- [ ] No secrets in Git
- [ ] .env in .gitignore
- [ ] .env.example provided (without secrets)

---

#### 10.3 Security Headers

**Test security headers**:
```bash
curl -I http://localhost:5000
```

**Expected Headers**:
- [ ] `X-Content-Type-Options: nosniff`
- [ ] `X-Frame-Options: DENY`
- [ ] `X-XSS-Protection: 1; mode=block`
- [ ] `Strict-Transport-Security` (if HTTPS)
- [ ] `Content-Security-Policy`

---

### ✅ Phase 11: Logging Verification

#### 11.1 Log Files

**Check logs directory**:
```bash
ls -la backend/logs/
```

**After running server, verify**:
- [ ] `combined.log` exists
- [ ] `error.log` exists
- [ ] Logs have timestamps
- [ ] JSON formatted

**Check log content**:
```bash
tail -n 20 backend/logs/combined.log
```

**Verification**:
- [ ] Structured JSON logs
- [ ] Timestamps present
- [ ] Log levels correct
- [ ] No sensitive data logged

---

#### 11.2 Error Logging

**Trigger an error**:
```bash
# Invalid GraphQL query
curl -X POST http://localhost:5000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ invalidQuery { id } }"}'
```

**Check error log**:
```bash
tail -n 10 backend/logs/error.log
```

**Verification**:
- [ ] Error logged
- [ ] Stack trace included
- [ ] Timestamp present
- [ ] Error level correct

---

### ✅ Phase 12: Final Smoke Tests

#### 12.1 Complete User Journey

**As an anonymous user**:

1. Open http://localhost:3000
   - [ ] Page loads

2. Search for an app
   - [ ] Search works
   - [ ] Results filter

3. Filter by category
   - [ ] Filters work
   - [ ] Results update

4. Toggle dark mode
   - [ ] Theme changes
   - [ ] Preference saved

5. Reload page
   - [ ] Dark mode persists
   - [ ] App state maintained

**Verification**:
- [ ] No errors in console
- [ ] No network failures
- [ ] Smooth user experience

---

#### 12.2 Stress Test

**Load test** (optional):
```bash
# Install autocannon if needed
npm install -g autocannon

# Test GraphQL endpoint
autocannon -c 10 -d 10 \
  -m POST \
  -H "Content-Type: application/json" \
  -b '{"query": "{ apps(limit: 5) { id } }"}' \
  http://localhost:5000/graphql
```

**Verification**:
- [ ] Server handles load
- [ ] No memory leaks
- [ ] Response time consistent
- [ ] No connection pool exhaustion

---

### ✅ Phase 13: Documentation Review

**Review all new documentation**:

- [ ] `README.testing.md` is accurate
- [ ] `CHANGES.md` is complete
- [ ] `VERIFICATION_CHECKLIST.md` is helpful
- [ ] Code comments are clear
- [ ] CLAUDE.md updated (if needed)

---

## 🚦 Go/No-Go Decision

### Critical (MUST PASS)

- [ ] All dependencies installed successfully
- [ ] Backend server starts without errors
- [ ] Frontend builds successfully
- [ ] Database connection works
- [ ] GraphQL queries execute
- [ ] No critical security vulnerabilities

### High Priority (SHOULD PASS)

- [ ] All tests pass (frontend, backend, E2E)
- [ ] No import/module errors
- [ ] Components render correctly
- [ ] Authentication works
- [ ] Build size reasonable
- [ ] No console errors

### Medium Priority (NICE TO HAVE)

- [ ] CI/CD pipeline configured
- [ ] Coverage thresholds met
- [ ] Performance benchmarks met
- [ ] Lighthouse scores good
- [ ] Documentation complete

---

## 📝 Sign-Off

**Verified By**: _________________
**Date**: _________________
**Environment**: Development / Staging / Production

**Issues Found**: _________________

**Notes**: _________________

**Recommendation**:
- [ ] ✅ APPROVED for deployment
- [ ] ⚠️  APPROVED with minor issues
- [ ] ❌ NOT APPROVED (blocking issues)

---

## 🆘 Troubleshooting Guide

### Issue: Dependencies Won't Install

**Symptoms**: npm install fails, UNMET DEPENDENCY errors

**Solutions**:
1. Clear npm cache: `npm cache clean --force`
2. Delete node_modules: `rm -rf node_modules package-lock.json`
3. Reinstall: `npm install`
4. Check Node version: `node --version` (should be 16+)

---

### Issue: Tests Fail

**Symptoms**: Test suites fail, module not found

**Solutions**:
1. Ensure all dependencies installed
2. Check environment variables
3. Verify database is running (for backend tests)
4. Check test setup files exist
5. Run tests individually to isolate issue

---

### Issue: Build Fails

**Symptoms**: npm run build fails, module errors

**Solutions**:
1. Check all imports are correct
2. Verify all files exist
3. Clear Vite cache: `rm -rf dist node_modules/.vite`
4. Reinstall dependencies
5. Check for syntax errors in components

---

### Issue: Backend Won't Start

**Symptoms**: Server crashes on startup

**Solutions**:
1. Check PostgreSQL is running
2. Verify database credentials in .env
3. Check port 5000 is available
4. Review backend logs
5. Ensure all required env vars set

---

### Issue: Frontend Shows Errors

**Symptoms**: Blank page, console errors

**Solutions**:
1. Check backend is running
2. Verify API URL in .env
3. Check CORS configuration
4. Review browser console for specific errors
5. Check Network tab for failed requests

---

### Issue: Playwright Fails

**Symptoms**: E2E tests timeout, browser errors

**Solutions**:
1. Reinstall browsers: `npx playwright install --with-deps`
2. Check both servers are running
3. Verify URLs in playwright.config.js
4. Increase timeout values
5. Run with `--debug` flag for more info

---

## ✅ Post-Deployment Checklist

**After deploying to production**:

- [ ] All environment variables configured
- [ ] Database migrated successfully
- [ ] Secrets rotated (JWT_SECRET, etc.)
- [ ] SSL/TLS certificates valid
- [ ] DNS configured correctly
- [ ] CDN configured (if applicable)
- [ ] Error tracking enabled (Sentry)
- [ ] Monitoring enabled (uptime, performance)
- [ ] Backup strategy in place
- [ ] Rollback plan documented

---

**End of Verification Checklist**
