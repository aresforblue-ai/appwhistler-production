# API Integration Audit Report
**AppWhistler Production - GraphQL/Apollo Client Integration**
**Date:** November 22, 2025
**Scope:** Frontend Apollo Client, Backend GraphQL Server, API Integration Patterns

---

## Executive Summary

This audit identifies **28 critical issues** across 8 categories affecting API reliability, error handling, and user experience. The integration is functional but lacks production-grade resilience patterns.

**Risk Level:** 🔴 **HIGH** - Multiple critical gaps in error recovery and network handling

---

## 1. Missing Error Handling in API Calls ⚠️ CRITICAL

### Frontend Issues

#### 1.1 No Error Link in Apollo Client
**File:** `src/apollo/client.js`
**Severity:** 🔴 Critical

**Issue:**
- Apollo Client lacks `onError` link for centralized error handling
- Network errors and GraphQL errors are not intercepted globally
- No retry logic for failed requests
- No logging/monitoring of API failures

**Impact:**
- Silent failures may go unnoticed
- Users see generic errors without context
- No automatic recovery from transient failures
- Difficult to debug production issues

**Current State:**
```javascript
// Only has: httpLink, authLink, wsLink, splitLink
// Missing: errorLink for centralized error handling
```

**Recommendation:**
```javascript
import { onError } from '@apollo/client/link/error';

const errorLink = onError(({ graphQLErrors, networkError, operation, forward }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path, extensions }) => {
      console.error(
        `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`,
        extensions
      );
      
      // Handle specific error codes
      if (extensions?.code === 'UNAUTHENTICATED') {
        clearAuth();
        window.location.href = '/login';
      }
    });
  }

  if (networkError) {
    console.error(`[Network error]: ${networkError}`);
    // Show user-friendly notification
    // Trigger retry logic
  }
});

// Chain: errorLink.concat(authLink).concat(httpLink)
```

#### 1.2 No Error Callbacks in useQuery
**File:** `src/App.jsx` (line 16)
**Severity:** 🟡 Medium

**Issue:**
```javascript
const { data, loading, error } = useQuery(GET_TRENDING_APPS, {
  variables: { limit: 50 }
  // Missing: onError, onCompleted callbacks
});
```

**Problems:**
- No logging when queries fail
- No retry or refetch mechanism
- Error state rendered but not tracked

**Recommendation:**
```javascript
const { data, loading, error, refetch, networkStatus } = useQuery(GET_TRENDING_APPS, {
  variables: { limit: 50 },
  notifyOnNetworkStatusChange: true,
  onError: (error) => {
    console.error('Failed to load trending apps:', error);
    // Send to error tracking service (Sentry)
  },
  onCompleted: (data) => {
    console.log(`Loaded ${data.trendingApps.length} apps`);
  }
});
```

#### 1.3 No Mutation Error Handling
**Severity:** 🔴 Critical

**Issue:**
- No `useMutation` hooks found in codebase
- Mutations (login, register, reviews) not implemented in frontend
- Backend has mutation resolvers but frontend doesn't call them

**Files Missing Mutations:**
- `src/App.jsx` - No authentication flows
- No components for submitting reviews
- No user profile management

**Backend Mutations Available (unused):**
- `register`, `login`, `logout` (auth.js)
- `submitReview` (reviews.js)
- `createFactCheck`, `verifyFactCheck` (factChecks.js)

---

## 2. Improper Retry Logic ⚠️ CRITICAL

### 2.1 No HTTP Retry Policy
**File:** `src/apollo/client.js`
**Severity:** 🔴 Critical

**Issue:**
- No retry mechanism for failed HTTP requests
- Single failed request permanently fails
- No exponential backoff for transient errors

**Current State:**
```javascript
const httpLink = createHttpLink({
  uri: `${HTTP_URI}/graphql`,
  credentials: 'include',
  // Missing: fetch with retry logic
});
```

**Recommendation:**
Install `@apollo/client/link/retry` and add:
```javascript
import { RetryLink } from '@apollo/client/link/retry';

const retryLink = new RetryLink({
  delay: {
    initial: 300,
    max: 10000,
    jitter: true
  },
  attempts: {
    max: 3,
    retryIf: (error, _operation) => {
      // Retry on network errors and 5xx server errors
      return !!error && error.statusCode >= 500;
    }
  }
});

// Chain: retryLink.concat(authLink).concat(httpLink)
```

### 2.2 WebSocket No Reconnection Limits
**File:** `src/apollo/client.js` (lines 34-47)
**Severity:** 🟡 Medium

**Issue:**
```javascript
const wsLink = new GraphQLWsLink(
  createClient({
    url: `${WS_URI}/graphql`,
    shouldRetry: () => true,  // ⚠️ ALWAYS retries, no limit
    retryAttempts: 5,         // ⚠️ Max attempts not enforced properly
    // Missing: exponential backoff, connection timeout
  })
);
```

**Problems:**
- `shouldRetry: () => true` ignores `retryAttempts`
- No exponential backoff between retries
- No connection timeout configured
- No handling of permanent connection failures

**Recommendation:**
```javascript
let wsRetryCount = 0;

const wsLink = new GraphQLWsLink(
  createClient({
    url: `${WS_URI}/graphql`,
    connectionParams: () => {
      const token = localStorage.getItem('appwhistler_token');
      return {
        authorization: token ? `Bearer ${token}` : '',
      };
    },
    shouldRetry: (errOrCloseEvent) => {
      // Stop retrying after 5 attempts
      if (wsRetryCount >= 5) {
        console.error('WebSocket max retries exceeded');
        return false;
      }
      wsRetryCount++;
      return true;
    },
    retryAttempts: 5,
    connectionTimeout: 30000,
    keepAlive: 15000,
    on: {
      connected: () => {
        wsRetryCount = 0; // Reset on successful connection
      },
      error: (error) => {
        console.error('WebSocket error:', error);
      }
    }
  })
);
```

### 2.3 Backend No Retry for External Services
**Files:** `backend/resolvers/factChecks.js`, `backend/utils/ipfsUpload.js`
**Severity:** 🟡 Medium

**Issue:**
- Calls to HuggingFace AI API have no retry logic
- IPFS uploads fail permanently on network hiccups
- Blockchain transactions not retried

---

## 3. Missing Loading States ⚠️ MEDIUM

### 3.1 No Network Status Differentiation
**File:** `src/App.jsx` (line 16)
**Severity:** 🟡 Medium

**Issue:**
```javascript
const { data, loading, error } = useQuery(GET_TRENDING_APPS, {
  variables: { limit: 50 }
});

{loading && <div>Loading...</div>}
```

**Problems:**
- Cannot distinguish initial load vs refetch vs polling
- No indication when data is stale but being refreshed
- `cache-and-network` policy shows cached data but loading stays false

**Recommendation:**
```javascript
const { data, loading, error, networkStatus } = useQuery(GET_TRENDING_APPS, {
  variables: { limit: 50 },
  notifyOnNetworkStatusChange: true
});

const isInitialLoading = loading && networkStatus === NetworkStatus.loading;
const isRefetching = networkStatus === NetworkStatus.refetch;
const isFetchingMore = networkStatus === NetworkStatus.fetchMore;

{isInitialLoading && <AppCardSkeleton />}
{isRefetching && <RefreshIndicator />}
```

### 3.2 No Mutation Loading States
**Severity:** 🔴 Critical

**Issue:**
- No mutation implementations means no loading states for:
  - Login/registration
  - Submitting reviews
  - Creating fact-checks
  - Profile updates

**Impact:**
- Users submit forms multiple times
- No feedback during async operations
- Poor UX on slow networks

### 3.3 Skeleton Loader Not Used Optimally
**File:** `src/App.jsx` (lines 132-139)

**Issue:**
```javascript
{loading && (
  <div>
    <div className="text-center mb-8">
      <div className="inline-block w-16 h-16 border-4 border-sky-500..."></div>
      <p>Loading truth-verified apps...</p>
    </div>
    <div className="grid...">
      {[...Array(6)].map((_, i) => <AppCardSkeleton key={i} />)}
    </div>
  </div>
)}
```

**Problem:**
- Shows both spinner AND skeletons (redundant)
- On refetch with cached data, removes all content

**Recommendation:**
```javascript
{isInitialLoading && (
  <div className="grid...">
    {[...Array(6)].map((_, i) => <AppCardSkeleton key={i} />)}
  </div>
)}

{isRefetching && !isInitialLoading && (
  <div className="fixed top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded">
    Refreshing...
  </div>
)}
```

---

## 4. Race Conditions in Concurrent Requests ⚠️ MEDIUM

### 4.1 No Request Deduplication
**File:** `src/apollo/client.js`
**Severity:** 🟡 Medium

**Issue:**
- Multiple components could trigger same query
- Apollo's default deduplication is not explicitly configured
- No request cancellation on component unmount

**Risk Scenario:**
1. User rapidly changes filters
2. Multiple `apps` queries fired in sequence
3. Earlier slow query completes after later fast query
4. UI shows stale data

**Recommendation:**
```javascript
const client = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache({...}),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-and-network',
      errorPolicy: 'all',
      nextFetchPolicy: 'cache-first' // ✅ Already set
    }
  },
  queryDeduplication: true, // ⚠️ ADD THIS (enabled by default but be explicit)
});
```

Add abort controller for search queries:
```javascript
const [searchQuery, setSearchQuery] = useState('');
const abortControllerRef = useRef(null);

useEffect(() => {
  // Cancel previous search
  if (abortControllerRef.current) {
    abortControllerRef.current.abort();
  }
  
  abortControllerRef.current = new AbortController();
  
  // Debounce search
  const timer = setTimeout(() => {
    // Trigger search with signal
  }, 300);
  
  return () => clearTimeout(timer);
}, [searchQuery]);
```

### 4.2 Backend Concurrent Query Risks
**File:** `backend/utils/dataLoader.js`
**Severity:** 🟢 Low

**Status:** ✅ Mitigated by DataLoader batching

**Analysis:**
- DataLoader batches concurrent requests within same event loop tick
- `maxBatchSize: 100` prevents memory issues
- Cache prevents duplicate queries within request

**Remaining Risk:**
- Cache never expires during request lifetime
- Could serve stale data if mutations occur mid-request

---

## 5. Stale Data Issues ⚠️ MEDIUM

### 5.1 Cache Policy Too Aggressive
**File:** `src/apollo/client.js` (lines 90-102)
**Severity:** 🟡 Medium

**Issue:**
```javascript
defaultOptions: {
  watchQuery: {
    fetchPolicy: 'cache-and-network', // ✅ Good
    errorPolicy: 'all',
  },
  query: {
    fetchPolicy: 'cache-first',        // ⚠️ May serve stale data
    nextFetchPolicy: 'cache-and-network', // ✅ Good
    errorPolicy: 'all',
  },
}
```

**Problems:**
- `cache-first` means initial page load never hits network if cache exists
- User might see outdated truth ratings, verification status
- Trending apps list could be hours old

**Scenarios:**
1. User visits site → sees cached apps from yesterday
2. Admin verifies app → users don't see verification badge until manual refresh
3. Truth rating changes → not reflected until cache expires

**Recommendation:**
```javascript
query: {
  fetchPolicy: 'cache-and-network',  // Always check network
  nextFetchPolicy: 'cache-first',    // Subsequent polls can use cache
  errorPolicy: 'all',
}
```

Or add TTL to cache:
```javascript
cache: new InMemoryCache({
  typePolicies: {
    Query: {
      fields: {
        trendingApps: {
          read(cached, { cache }) {
            if (!cached) return cached;
            
            // Check if older than 5 minutes
            const timestamp = cache.readQuery({ 
              query: gql`{ __meta { timestamp } }` 
            });
            if (timestamp && Date.now() - timestamp > 5 * 60 * 1000) {
              return undefined; // Force refetch
            }
            return cached;
          }
        }
      }
    }
  }
})
```

### 5.2 No Cache Time-to-Live (TTL)
**Severity:** 🟡 Medium

**Issue:**
- Frontend cache has no expiration
- Backend Redis cache uses TTL but frontend doesn't respect it
- User could see data from previous session

**Files:**
- `backend/utils/cacheManager.js` - Sets TTL (300-3600s)
- `src/apollo/client.js` - No TTL implementation

**Recommendation:**
Add cache persistence with TTL:
```javascript
import { persistCacheSync, LocalStorageWrapper } from 'apollo3-cache-persist';

const cache = new InMemoryCache({...});

persistCacheSync({
  cache,
  storage: new LocalStorageWrapper(window.localStorage),
  maxSize: 5242880, // 5MB
  ttl: 3600 * 1000, // 1 hour
});
```

### 5.3 Backend Cache Not Invalidated on Mutations
**Files:** `backend/resolvers/apps.js`, `backend/resolvers/factChecks.js`
**Severity:** 🟡 Medium

**Issue:**
```javascript
// apps.js - Caches filtered queries
await cacheManager.set(cacheKey, response, 600); // 10 min cache

// But mutations don't clear cache:
// - submitReview (changes averageRating)
// - verifyApp (changes isVerified)
// - updateApp (changes all fields)
```

**Impact:**
- User submits review → app's rating not updated for 10 minutes
- Admin verifies app → "Verified" badge doesn't appear
- Cache serves stale data after mutations

**Recommendation:**
```javascript
// In mutation resolvers
const cacheManager = require('../utils/cacheManager');

submitReview: async (_, { input }, context) => {
  // ... insert review
  
  // Invalidate related caches
  await cacheManager.invalidate(`apps:filtered:*`);
  await cacheManager.invalidate(`app:${input.appId}`);
  await cacheManager.invalidate(`trending:apps:*`);
  
  return review;
}
```

---

## 6. Cache Invalidation Problems ⚠️ HIGH

### 6.1 No Cache Eviction Strategy
**File:** `src/apollo/client.js`
**Severity:** 🔴 Critical

**Issue:**
- No `cache.evict()` calls anywhere in frontend
- No `cache.modify()` for optimistic updates
- No manual cache updates after mutations
- `clearStore()` only called on logout (aggressive)

**Problems:**
```javascript
// On successful login mutation (not implemented):
// 1. Should update cache with new user data
// 2. Should invalidate old queries
// 3. Should NOT clear entire cache

// Current implementation:
export const clearAuth = () => {
  localStorage.removeItem('appwhistler_token');
  localStorage.removeItem('appwhistler_user');
  client.clearStore(); // ⚠️ Clears ALL data including public apps
};
```

**Recommendation:**
```javascript
// Selective cache clearing
export const clearAuth = async () => {
  localStorage.removeItem('appwhistler_token');
  localStorage.removeItem('appwhistler_user');
  
  // Only clear user-specific queries
  await client.cache.evict({ fieldName: 'me' });
  await client.cache.evict({ fieldName: 'userById' });
  await client.cache.gc(); // Garbage collect
  
  // Keep public data: trendingApps, apps, leaderboard
};

// After login mutation
const [login] = useMutation(LOGIN_USER, {
  update: (cache, { data: { login } }) => {
    // Write user to cache
    cache.writeQuery({
      query: GET_CURRENT_USER,
      data: { me: login.user }
    });
  },
  onCompleted: ({ login }) => {
    setAuth(login.token, login.user);
  }
});
```

### 6.2 Pagination Cache Merge Issues
**File:** `src/apollo/client.js` (lines 72-81)
**Severity:** 🟡 Medium

**Issue:**
```javascript
apps: {
  keyArgs: ['category', 'platform', 'minTruthRating'],
  merge(existing, incoming) {
    if (!existing) return incoming;
    return {
      ...incoming,
      edges: [...existing.edges, ...incoming.edges] // ⚠️ ALWAYS appends
    };
  }
}
```

**Problems:**
- Append-only merge causes duplicates if refetching
- No duplicate detection by `id`
- `keyArgs` missing `search` and `offset` → same cache key for different searches
- Stale data never removed

**Example Bug:**
```
1. User searches "news" → cache key: apps:category:news
2. Gets apps 1-10
3. User changes filter to "all" → cache key: apps:category:all
4. Merges with existing → now shows news apps + all apps (wrong!)
```

**Recommendation:**
```javascript
apps: {
  keyArgs: ['category', 'platform', 'minTruthRating', 'search'],
  merge(existing, incoming, { args, readField }) {
    if (!existing) return incoming;
    
    const offset = args?.offset ?? 0;
    
    // If offset is 0, replace (new search/filter)
    if (offset === 0) return incoming;
    
    // Otherwise, merge and deduplicate
    const merged = existing.edges.slice();
    const existingIds = new Set(merged.map(app => readField('id', app)));
    
    incoming.edges.forEach(app => {
      const id = readField('id', app);
      if (!existingIds.has(id)) {
        merged.push(app);
      }
    });
    
    return {
      ...incoming,
      edges: merged
    };
  }
}
```

### 6.3 No Cache Warming
**Severity:** 🟢 Low (Optimization)

**Issue:**
- No preloading of critical queries on app start
- `trendingApps` waits until component mounts
- Could prefetch during app initialization

---

## 7. WebSocket Connection Handling ⚠️ HIGH

### 7.1 No Connection State Management
**File:** `src/apollo/client.js`
**Severity:** 🔴 Critical

**Issue:**
- No way to detect WebSocket connection state
- No UI indication of online/offline status
- No reconnection feedback to user

**Frontend Missing:**
```javascript
// No tracking of:
// - Connected
// - Connecting
// - Disconnected
// - Error

// No event handlers:
wsLink.on('connected', () => {...})
wsLink.on('closed', () => {...})
wsLink.on('error', () => {...})
```

**Recommendation:**
```javascript
import { createClient } from 'graphql-ws';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';

const wsClient = createClient({
  url: `${WS_URI}/graphql`,
  connectionParams: () => ({
    authorization: localStorage.getItem('appwhistler_token') ? 
      `Bearer ${localStorage.getItem('appwhistler_token')}` : ''
  }),
  on: {
    connected: () => {
      console.log('✅ WebSocket connected');
      document.dispatchEvent(new CustomEvent('ws:connected'));
    },
    error: (error) => {
      console.error('❌ WebSocket error:', error);
      document.dispatchEvent(new CustomEvent('ws:error', { detail: error }));
    },
    closed: () => {
      console.log('🔌 WebSocket disconnected');
      document.dispatchEvent(new CustomEvent('ws:disconnected'));
    }
  },
  shouldRetry: () => true,
  retryAttempts: 5,
  connectionTimeout: 30000,
  keepAlive: 15000,
});

const wsLink = new GraphQLWsLink(wsClient);

// In React component:
useEffect(() => {
  const handleOnline = () => setOnline(true);
  const handleOffline = () => setOnline(false);
  
  document.addEventListener('ws:connected', handleOnline);
  document.addEventListener('ws:disconnected', handleOffline);
  
  return () => {
    document.removeEventListener('ws:connected', handleOnline);
    document.removeEventListener('ws:disconnected', handleOffline);
  };
}, []);
```

### 7.2 Backend WebSocket Not Integrated with GraphQL
**File:** `backend/server.js` (lines 283-311)
**Severity:** 🔴 Critical

**Issue:**
```javascript
// Socket.io server runs separately from GraphQL
const io = new Server(httpServer, {...});

io.on('connection', (socket) => {
  socket.on('subscribe:factchecks', (category) => {
    socket.join(`factchecks:${category}`);
  });
});

// But GraphQL subscriptions defined in schema.js:
subscription OnFactCheckAdded($category: String) {
  factCheckAdded(category: $category) {...}
}

// ⚠️ NO INTEGRATION between Socket.io and GraphQL subscriptions!
```

**Problems:**
- GraphQL subscriptions defined but not implemented
- Socket.io uses custom events (not GraphQL)
- Frontend GraphQL subscriptions won't work
- Dual WebSocket systems (confusing)

**Recommendation:**
Option 1: Remove Socket.io, use GraphQL subscriptions only:
```javascript
// Replace Socket.io with graphql-ws
const { useServer } = require('graphql-ws/lib/use/ws');
const { WebSocketServer } = require('ws');

const wsServer = new WebSocketServer({
  server: httpServer,
  path: '/graphql',
});

useServer({
  schema: makeExecutableSchema({ typeDefs, resolvers }),
  context: ({ req }) => ({
    pool,
    user: req.user,
    loaders: createBatchLoaders(pool)
  })
}, wsServer);
```

Option 2: Keep Socket.io but document it's for non-GraphQL real-time:
- GraphQL subscriptions for query/mutation updates
- Socket.io for custom events (chat, notifications)

### 7.3 No Subscription Usage in Frontend
**File:** `src/graphql/queries.js` (lines 214-242)
**Severity:** 🟡 Medium

**Issue:**
- Subscriptions defined (`FACT_CHECK_ADDED`, `APP_VERIFIED`)
- But NO `useSubscription` hooks in frontend
- Real-time features advertised but not implemented

**Files Missing Subscriptions:**
- `src/App.jsx` - Could subscribe to app updates
- No fact-check live feed component
- No verification notifications

**Recommendation:**
```javascript
import { useSubscription } from '@apollo/client';
import { FACT_CHECK_ADDED } from './graphql/queries';

function FactCheckFeed({ category }) {
  const { data, loading } = useSubscription(FACT_CHECK_ADDED, {
    variables: { category },
    onSubscriptionData: ({ subscriptionData }) => {
      const newCheck = subscriptionData.data.factCheckAdded;
      // Show toast notification
      toast.success(`New fact-check: ${newCheck.claim}`);
    }
  });
  
  return <div>...</div>;
}
```

### 7.4 No WebSocket Auth Token Refresh
**File:** `src/apollo/client.js` (lines 36-41)
**Severity:** 🟡 Medium

**Issue:**
```javascript
const wsLink = new GraphQLWsLink(
  createClient({
    connectionParams: () => {
      const token = localStorage.getItem('appwhistler_token');
      return {
        authorization: token ? `Bearer ${token}` : '',
      };
    },
    // ⚠️ Token read once at connection time, never refreshed
  })
);
```

**Problem:**
- If JWT expires while WebSocket is open, subscriptions fail
- User must reconnect manually
- No token refresh mechanism

**Recommendation:**
```javascript
connectionParams: async () => {
  let token = localStorage.getItem('appwhistler_token');
  
  // Check if token expired
  if (token && isTokenExpired(token)) {
    // Refresh token
    token = await refreshAuthToken();
    localStorage.setItem('appwhistler_token', token);
  }
  
  return {
    authorization: token ? `Bearer ${token}` : ''
  };
}
```

---

## 8. Network Error Recovery ⚠️ HIGH

### 8.1 No Offline Detection
**Files:** `src/apollo/client.js`, `src/App.jsx`
**Severity:** 🔴 Critical

**Issue:**
- No `navigator.onLine` checks
- No offline indicators in UI
- Queries fail silently when offline
- No queue for offline mutations

**Recommendation:**
```javascript
// In App.jsx
const [isOnline, setIsOnline] = useState(navigator.onLine);

useEffect(() => {
  const handleOnline = () => setIsOnline(true);
  const handleOffline = () => setIsOnline(false);
  
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}, []);

// Show banner when offline
{!isOnline && (
  <div className="fixed top-0 w-full bg-red-500 text-white text-center py-2">
    ⚠️ You are offline. Data may be stale.
  </div>
)}
```

Add offline link:
```javascript
import { ApolloLink, Observable } from '@apollo/client';

const offlineLink = new ApolloLink((operation, forward) => {
  if (!navigator.onLine) {
    // Queue operation for later or return cached data
    return new Observable(observer => {
      observer.error(new Error('You are offline'));
    });
  }
  return forward(operation);
});
```

### 8.2 No Timeout Configuration
**File:** `src/apollo/client.js`
**Severity:** 🟡 Medium

**Issue:**
- No request timeout set
- Slow queries can hang indefinitely
- No way to cancel long-running requests

**Recommendation:**
```javascript
const httpLink = createHttpLink({
  uri: `${HTTP_URI}/graphql`,
  credentials: 'include',
  fetch: (uri, options) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout
    
    return fetch(uri, {
      ...options,
      signal: controller.signal
    }).finally(() => clearTimeout(timeout));
  }
});
```

### 8.3 No Network Status Polling
**Severity:** 🟢 Low (Enhancement)

**Issue:**
- Could implement health check polling
- Detect backend unavailability proactively
- Show maintenance mode UI

**Recommendation:**
```javascript
const { data: healthStatus } = useQuery(HEALTH_CHECK_QUERY, {
  pollInterval: 60000, // Check every minute
  notifyOnNetworkStatusChange: true,
  onError: () => {
    // Backend is down
    showMaintenanceMode();
  }
});
```

### 8.4 Backend Error Responses Not Standardized
**Files:** Various backend resolvers
**Severity:** 🟡 Medium

**Issue:**
- Some resolvers use `createGraphQLError` (good)
- Some throw generic errors (bad)
- Inconsistent error codes

**Example Issues:**
```javascript
// ✅ Good:
throw createGraphQLError('User not found', 'NOT_FOUND');

// ❌ Bad:
throw new Error('Something went wrong'); // Generic, no code

// ❌ Bad:
return { success: false, error: 'Failed' }; // Not a GraphQL error
```

**Recommendation:**
Enforce error handling wrapper:
```javascript
// All resolvers should use withErrorHandling
module.exports = {
  Query: {
    app: withErrorHandling(async (_, { id }, context) => {
      // All errors automatically caught and formatted
    })
  }
};
```

---

## 9. Additional Critical Findings

### 9.1 No Request Deduplication Keys
**File:** `src/graphql/queries.js`
**Severity:** 🟡 Medium

**Issue:**
- GraphQL queries don't use `@connection` directive
- Apollo can't deduplicate paginated queries properly

**Recommendation:**
```graphql
query SearchApps(...) @connection(key: "apps") {
  apps(search: $search, ...) {
    edges { ... }
    pageInfo { ... }
  }
}
```

### 9.2 No Sentry Integration in Frontend
**File:** `src/main.jsx`
**Severity:** 🟡 Medium

**Issue:**
- Backend has Sentry (`backend/server.js`)
- Frontend imports Sentry DSN but doesn't initialize
- API errors not tracked in production

**Recommendation:**
```javascript
// In src/main.jsx
import * as Sentry from '@sentry/react';

if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    integrations: [
      new Sentry.BrowserTracing(),
      new Sentry.Replay()
    ],
    tracesSampleRate: 1.0,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });
}
```

### 9.3 No Rate Limit Handling
**Files:** `src/apollo/client.js`, `src/App.jsx`
**Severity:** 🟡 Medium

**Issue:**
- Backend rate limits requests (429 errors)
- Frontend doesn't handle 429 responses
- No backoff or retry-after header respect

**Recommendation:**
```javascript
const errorLink = onError(({ graphQLErrors, networkError }) => {
  if (networkError?.statusCode === 429) {
    const retryAfter = networkError.headers.get('Retry-After');
    // Show user notification
    toast.error(`Rate limited. Retry in ${retryAfter}s`);
    // Pause requests
  }
});
```

---

## 10. Performance Issues

### 10.1 No Query Batching
**Severity:** 🟢 Low (Optimization)

**Issue:**
- Multiple queries could be batched into single HTTP request
- Apollo Client supports batching but not configured

**Recommendation:**
```javascript
import { BatchHttpLink } from '@apollo/client/link/batch-http';

const batchLink = new BatchHttpLink({
  uri: `${HTTP_URI}/graphql`,
  batchMax: 10,
  batchInterval: 20,
});
```

### 10.2 No Persisted Queries
**Severity:** 🟢 Low (Optimization)

**Issue:**
- Full GraphQL queries sent in every request
- Large query strings increase bandwidth
- Could use automatic persisted queries (APQ)

---

## Summary of Issues by Severity

| Severity | Count | Issues |
|----------|-------|--------|
| 🔴 Critical | 8 | No error link, no mutation handling, no retry logic, no cache eviction, WebSocket not integrated, no offline detection, no connection state, missing subscriptions |
| 🟡 Medium | 15 | No error callbacks, weak WebSocket retry, no network status, stale cache policies, no TTL, cache invalidation, pagination bugs, no timeout, no Sentry, no rate limit handling |
| 🟢 Low | 5 | No cache warming, no request keys, no query batching, no persisted queries, network polling |

**Total Issues: 28**

---

## Recommended Priority Fixes

### Phase 1: Critical (Week 1)
1. **Add Error Link** - Centralized error handling with logging
2. **Implement Retry Logic** - RetryLink for HTTP, proper WebSocket retry
3. **Add Mutation Handling** - Complete login/register/review flows
4. **Fix Cache Eviction** - Selective clearing, optimistic updates
5. **Add Offline Detection** - UI indicators, queued mutations
6. **Integrate WebSocket with GraphQL** - Remove dual WebSocket systems

### Phase 2: High Priority (Week 2)
7. **Fix Cache Policy** - Change to `cache-and-network`
8. **Add Connection State UI** - Show online/offline status
9. **Implement Subscriptions** - Use defined GraphQL subscriptions
10. **Add Timeout Configuration** - 30s request timeout
11. **Fix Pagination Merge** - Deduplicate by ID, proper keyArgs
12. **Add Cache Invalidation** - Clear on mutations

### Phase 3: Medium Priority (Week 3)
13. **Add Loading States** - Network status differentiation
14. **Setup Sentry Frontend** - Error tracking in production
15. **Add Rate Limit Handling** - Respect 429 responses
16. **Add Cache TTL** - Expire stale data
17. **Add WebSocket Auth Refresh** - Handle token expiration

### Phase 4: Enhancements (Week 4)
18. **Add Query Batching** - Reduce HTTP requests
19. **Add Persisted Queries** - Reduce bandwidth
20. **Add Health Check Polling** - Proactive downtime detection

---

## Testing Requirements

### Unit Tests Needed
- Apollo Client link chain
- Error handlers
- Cache merge functions
- Offline detection

### Integration Tests Needed
- Full query/mutation flows
- WebSocket subscriptions
- Retry mechanisms
- Cache invalidation

### E2E Tests Needed
- Offline scenarios
- Network interruption recovery
- Token expiration handling
- Rate limit responses

---

## Monitoring Recommendations

### Metrics to Track
- API error rate (by error code)
- Query latency (p50, p95, p99)
- Cache hit/miss ratio
- WebSocket reconnection rate
- Retry attempt frequency
- Offline event frequency

### Alerts to Setup
- Error rate > 5%
- API latency > 5s
- WebSocket disconnections > 10/min
- Cache invalidation failures

---

## Conclusion

The AppWhistler API integration is **functional for basic usage** but lacks production-grade resilience. The most critical gaps are:

1. **No centralized error handling** - Silent failures
2. **No retry logic** - Permanent failures on transient errors  
3. **Incomplete mutation implementation** - Core features missing
4. **Poor cache management** - Stale data served to users
5. **WebSocket integration incomplete** - Subscriptions broken
6. **No offline support** - Poor UX on unstable networks

**Estimated effort to fix critical issues:** 2-3 weeks for experienced developer

**Risk if not addressed:** Users will experience:
- Silent errors and confusion
- Stale data (wrong truth ratings)
- Failed actions (submissions lost)
- Poor mobile/unstable network experience

---

**Report Generated:** November 22, 2025
**Auditor:** GitHub Copilot (Claude Sonnet 4.5)
**Next Steps:** Review with development team, prioritize fixes, assign tasks
