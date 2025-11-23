# AppWhistler Critical Issues - Migration Plan

## Executive Summary
This document outlines the migration plan for fixing 33 critical and 54 high-priority issues identified in the comprehensive code audit. The plan is divided into 4 phases over 6 weeks.

---

## Phase 1: Security & Stability (Week 1-2)
**Goal**: Fix all critical security vulnerabilities and prevent app crashes

### 1.1 Security Fixes (Week 1, Days 1-3)

#### ✅ COMPLETED:
- [x] Remove `.env` from Git tracking
- [x] Fix backend dependency version conflicts
- [x] Add missing dependencies (@sendgrid/mail, redis, bullmq)
- [x] Add React Error Boundary
- [x] Fix SQL injection in search queries (apps.js)
- [x] Add WebSocket cleanup function

#### TODO (Days 1-3):
- [ ] **Rotate ALL secrets immediately**
  - Generate new JWT_SECRET (256-bit random)
  - Generate new REFRESH_TOKEN_SECRET
  - Update DB_PASSWORD
  - Update API keys (SendGrid, Sentry, Pinata, etc.)
  - Deploy new secrets to production
  
- [ ] **Fix remaining SQL injection vulnerabilities**
  - Fix `backend/resolvers/factChecks.js` (3 locations)
  - Fix `backend/resolvers/bounties.js` (1 location)
  - Create helper function for safe ILIKE patterns

- [ ] **Add XSS protection**
  - Install DOMPurify: `npm install dompurify`
  - Sanitize `app.description` in AppCard component
  - Sanitize all user-generated content display
  - Add CSP headers in helmet configuration

- [ ] **Update vulnerable dependencies**
  ```bash
  cd backend
  npm update axios
  npm audit fix --force
  ```

### 1.2 Authentication & Authorization (Week 1, Days 4-5)

- [ ] **Fix `recommendedApps` query authorization**
  - Add authentication check
  - Verify user can only access own recommendations
  - Add admin override for support

- [ ] **Fix `user` query privacy controls**
  - Implement privacy settings check
  - Redact sensitive fields for non-owners
  - Add profile visibility levels (public/private/friends)

- [ ] **Standardize auth context extraction**
  - Remove duplicate token verification in `requireAuth`
  - Use `context.user` from middleware consistently
  - Verify Apollo Server context includes user

- [ ] **Add CSRF protection**
  - Install `csurf` package
  - Add CSRF token middleware
  - Update frontend to send CSRF tokens

### 1.3 Database Connection Pool Fixes (Week 2, Days 1-2)

- [ ] **Fix connection pool leaks**
  - Update all transaction patterns to use `pool.connect()`
  - Add `finally` blocks for client release
  - Example pattern:
    ```javascript
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      // ... transaction queries
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release(); // CRITICAL
    }
    ```
  
- [ ] **Add row-level locking for concurrent operations**
  - Fix vote transaction race condition
  - Add `FOR UPDATE` to SELECT queries in transactions
  - Test with concurrent users

- [ ] **Configure pool error handler**
  ```javascript
  pool.on('error', (err, client) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
  });
  ```

### 1.4 Input Validation (Week 2, Days 3-5)

- [ ] **Add pagination limits**
  - Enforce max limit of 100 across all queries
  - Add validation helper: `sanitizePaginationParams(limit, offset)`

- [ ] **Validate numeric inputs**
  - `rewardAmount` in bounty creation (0.01 - 10,000)
  - `truthRating` (1-5 range)
  - `confidence` scores (0-100)

- [ ] **Validate JSON fields**
  - Schema validation for `socialLinks`
  - Size limits for JSON objects
  - Prevent malformed JSON storage

- [ ] **Add rate limiting to expensive mutations**
  - `submitFactCheck`: 10 per hour per user
  - `createReview`: 20 per day per user
  - `createBounty`: 5 per day per user

---

## Phase 2: Performance & N+1 Queries (Week 3)

### 2.1 DataLoader Improvements

- [ ] **Remove fallback patterns**
  - Ensure loaders always initialized
  - Throw error if loaders missing
  - Add startup validation

- [ ] **Add missing DataLoaders**
  - `reviewsByUserId` for user profile pages
  - `appsByCategoryId` for category listings
  - `factChecksByAppId` for app detail pages

- [ ] **Test N+1 prevention**
  - Use GraphQL query complexity tool
  - Profile queries with 100+ nested entities
  - Verify single-digit query counts

### 2.2 Database Indexing

- [ ] **Add critical indexes**
  ```sql
  CREATE INDEX idx_users_truth_score ON users(truth_score DESC);
  CREATE INDEX idx_fact_check_votes_user_id ON fact_check_votes(user_id);
  CREATE INDEX idx_fact_check_votes_check_id ON fact_check_votes(fact_check_id);
  CREATE INDEX idx_password_reset_requests_token ON password_reset_requests(token);
  CREATE INDEX idx_activity_log_user_id ON activity_log(user_id);
  CREATE INDEX idx_apps_category ON apps(category);
  CREATE INDEX idx_apps_truth_rating ON apps(truth_rating DESC);
  ```

- [ ] **Optimize full-text search**
  - Create GIN indexes on `search_vector` columns
  - Use `websearch_to_tsquery` for user-friendly syntax
  - Cache parsed ts_query results

- [ ] **Analyze query performance**
  - Run `EXPLAIN ANALYZE` on slow queries
  - Target queries taking >100ms
  - Optimize join strategies

### 2.3 Caching Strategy

- [ ] **Add leaderboard caching**
  - Cache for 5 minutes like trending apps
  - Invalidate on user score updates
  - Use Redis if available

- [ ] **Implement cache invalidation**
  - Clear app cache after updates
  - Clear user cache after profile changes
  - Add cache version keys

- [ ] **Add query result caching**
  - Cache expensive aggregations
  - Cache public data (categories, stats)
  - Set appropriate TTLs (5min - 1hour)

---

## Phase 3: Frontend Improvements (Week 4)

### 3.1 Apollo Client Error Handling

- [ ] **Add error link**
  ```javascript
  import { onError } from '@apollo/client/link/error';
  
  const errorLink = onError(({ graphQLErrors, networkErrors }) => {
    if (graphQLErrors) {
      graphQLErrors.forEach(({ message, extensions }) => {
        if (extensions?.code === 'UNAUTHENTICATED') {
          // Redirect to login
          localStorage.removeItem('appwhistler_token');
          window.location.href = '/login';
        }
        // Log to Sentry
        Sentry.captureException(new Error(message));
      });
    }
    if (networkError) {
      // Handle network errors
      console.error('Network error:', networkError);
    }
  });
  ```

- [ ] **Add retry logic**
  - Install `@apollo/client/link/retry`
  - Retry failed queries 3 times with exponential backoff
  - Don't retry mutations (except idempotent ones)

- [ ] **Add request timeouts**
  ```javascript
  const httpLink = createHttpLink({
    uri: `${HTTP_URI}/graphql`,
    fetchOptions: {
      timeout: 10000, // 10 seconds
    },
  });
  ```

### 3.2 Cache Management

- [ ] **Fix cache invalidation**
  ```javascript
  // After mutations, evict stale cache entries
  cache.evict({ fieldName: 'apps' });
  cache.evict({ fieldName: 'trendingApps' });
  cache.gc(); // Garbage collect
  ```

- [ ] **Fix pagination merge logic**
  - Prevent duplicate items in paginated lists
  - Use unique identifiers for deduplication
  - Test append vs replace scenarios

- [ ] **Implement cache persistence**
  - Install `apollo3-cache-persist`
  - Store cache in localStorage
  - Restore on app load

### 3.3 React Component Improvements

- [ ] **Add PropTypes or migrate to TypeScript**
  - Install `prop-types` package
  - Add PropTypes to all components
  - OR start TypeScript migration (preferred)

- [ ] **Optimize re-renders**
  - Wrap `filteredApps` in `useMemo`
  - Add `React.memo` to pure components (AppCard, MetricCard, etc.)
  - Use `useCallback` for event handlers

- [ ] **Fix localStorage error handling**
  ```javascript
  function safeLocalStorage(key, defaultValue) {
    try {
      return localStorage.getItem(key) || defaultValue;
    } catch {
      return defaultValue;
    }
  }
  ```

- [ ] **Add accessibility**
  - Add ARIA labels to all buttons
  - Add alt text to images/icons
  - Add keyboard navigation support
  - Test with screen readers

### 3.4 Implement Missing Mutations

- [ ] **Authentication mutations**
  - `login` mutation with frontend form
  - `logout` mutation with token cleanup
  - `refreshToken` mutation with auto-refresh

- [ ] **Review mutations**
  - `createReview` form component
  - `updateReview` edit functionality
  - `deleteReview` with confirmation

- [ ] **Bounty mutations**
  - `claimBounty` button
  - `completeBounty` workflow
  - Status tracking UI

---

## Phase 4: Testing & Documentation (Week 5-6)

### 4.1 Test Coverage (Week 5)

- [ ] **Backend unit tests**
  - Test all resolvers (target: 70% coverage)
  - Test validation functions
  - Test authentication helpers
  - Mock database queries

- [ ] **Frontend unit tests**
  - Test components with React Testing Library
  - Test Apollo hooks with MockedProvider
  - Test error boundary
  - Target: 70% coverage

- [ ] **Integration tests**
  - Test complete user flows (signup → login → create review)
  - Test GraphQL query chains
  - Test WebSocket connections

- [ ] **E2E tests with Playwright**
  - Test critical user journeys
  - Test across browsers (Chrome, Firefox, Safari)
  - Test mobile responsive design

### 4.2 Security Penetration Testing (Week 5)

- [ ] **SQL injection testing**
  - Test all search inputs with malicious patterns
  - Test ILIKE escaping with various payloads
  - Verify parameterized queries

- [ ] **XSS testing**
  - Test app descriptions with script tags
  - Test review content with malicious HTML
  - Verify DOMPurify sanitization

- [ ] **Authorization testing**
  - Test accessing other users' data
  - Test admin-only operations
  - Test rate limiting bypass attempts

- [ ] **CSRF testing**
  - Test mutations without CSRF tokens
  - Test cross-origin requests
  - Verify SameSite cookie attributes

### 4.3 Load Testing (Week 6, Days 1-2)

- [ ] **Backend load testing**
  - Use k6 or Artillery
  - Test with 1000 concurrent users
  - Identify bottlenecks
  - Target: <200ms p95 response time

- [ ] **Database connection pool testing**
  - Test pool exhaustion scenarios
  - Verify connection release
  - Monitor pool metrics

- [ ] **WebSocket stress testing**
  - Test 1000 concurrent WebSocket connections
  - Test reconnection logic
  - Monitor memory usage

### 4.4 Documentation (Week 6, Days 3-5)

- [ ] **Update `.github/copilot-instructions.md`**
  - Document all architectural changes
  - Add security best practices
  - Update known issues section

- [ ] **Create API documentation**
  - Generate GraphQL schema docs
  - Document authentication flow
  - Add example queries/mutations

- [ ] **Create `.env.example` files**
  - Frontend template
  - Backend template with all variables
  - Add comments explaining each variable

- [ ] **Update README.md**
  - Add setup instructions
  - Document development workflow
  - Add troubleshooting section

- [ ] **Create SECURITY.md**
  - Document security practices
  - Add vulnerability disclosure policy
  - List security contacts

---

## Implementation Strategy

### Parallel Workstreams

**Workstream 1: Security (Priority 1)**
- Developer A: Secret rotation, SQL injection fixes, XSS protection
- Timeline: Days 1-5

**Workstream 2: Database (Priority 1)**
- Developer B: Connection pool fixes, transactions, indexes
- Timeline: Days 1-7

**Workstream 3: Frontend (Priority 2)**
- Developer C: Error Boundary, Apollo Client improvements, React optimizations
- Timeline: Days 8-14

**Workstream 4: Backend Features (Priority 2)**
- Developer D: Missing mutations, authorization fixes, rate limiting
- Timeline: Days 8-14

**Workstream 5: Testing (Priority 3)**
- QA Engineer: Unit tests, integration tests, E2E tests, security testing
- Timeline: Days 15-28

### Daily Standups

- Review completed tasks
- Identify blockers
- Coordinate dependencies between workstreams

### Code Review Process

- All security fixes require 2 reviewers
- All database changes require DBA review
- All frontend changes require accessibility review
- Use pull request templates with security checklist

### Deployment Strategy

- Deploy fixes incrementally (not big bang)
- Phase 1 fixes deployed at end of Week 2
- Phase 2 fixes deployed at end of Week 3
- Phase 3 fixes deployed at end of Week 4
- Full deployment at end of Week 6

### Rollback Plan

- Keep previous version running in parallel
- Use feature flags for risky changes
- Database migrations must be reversible
- Monitor error rates post-deployment

---

## Success Metrics

### Phase 1 Success Criteria
- ✅ Zero critical security vulnerabilities
- ✅ Zero app crashes in production (Error Boundary catches all)
- ✅ All dependencies installed and version conflicts resolved
- ✅ Database connection pool stable (no leaks)

### Phase 2 Success Criteria
- ✅ All queries execute in <200ms (p95)
- ✅ Zero N+1 queries in production
- ✅ Cache hit ratio >70%

### Phase 3 Success Criteria
- ✅ All mutations implemented and functional
- ✅ Accessibility audit passes (WCAG 2.1 AA)
- ✅ Bundle size <500KB (gzipped)

### Phase 4 Success Criteria
- ✅ 70% test coverage (backend + frontend)
- ✅ Zero high-severity security findings in pen test
- ✅ Load test passes (1000 concurrent users, <200ms p95)
- ✅ Documentation complete and up-to-date

---

## Risk Assessment

### High Risk Items
1. **Secret rotation in production** - Requires careful coordination
2. **Database migrations** - Potential downtime or data loss
3. **Cache invalidation logic** - Risk of stale data bugs
4. **WebSocket refactor** - Risk of breaking real-time features

### Mitigation Strategies
1. Rotate secrets during maintenance window with blue-green deployment
2. Test migrations on staging with production data copy
3. Add cache versioning and manual invalidation endpoints
4. Comprehensive WebSocket testing before deployment

---

## Post-Migration Monitoring

### Week 7-8: Monitoring & Optimization

- [ ] **Monitor error rates**
  - Set up Sentry alerts for new errors
  - Track error rate vs baseline
  - Fix any regressions immediately

- [ ] **Monitor performance**
  - Track query response times
  - Monitor database connection pool usage
  - Track cache hit rates

- [ ] **Collect user feedback**
  - Survey users on app stability
  - Track bounce rates and engagement
  - Monitor app store ratings

- [ ] **Continuous optimization**
  - Identify remaining bottlenecks
  - Optimize slow queries
  - Reduce bundle size further

---

## Estimated Effort

| Phase | Person-Weeks | Timeline |
|-------|--------------|----------|
| Phase 1 | 6 weeks (3 devs × 2 weeks) | Week 1-2 |
| Phase 2 | 3 weeks (1 dev × 3 weeks) | Week 3 |
| Phase 3 | 6 weeks (2 devs × 3 weeks) | Week 4-6 |
| Phase 4 | 3 weeks (1 QA × 3 weeks) | Week 5-6 |
| **TOTAL** | **18 person-weeks** | **6 weeks** |

**Team Size**: 4 developers + 1 QA engineer

---

## Next Steps

1. ✅ Review this migration plan with team
2. ✅ Assign developers to workstreams
3. ✅ Set up project tracking (GitHub Issues/Projects)
4. ✅ Schedule daily standups
5. ✅ Begin Phase 1 implementation

**Migration Start Date**: [TO BE DETERMINED]
**Target Completion**: 6 weeks from start

---

*Last Updated: November 23, 2025*
*Status: ✅ Phases 1.1-1.2 In Progress*
