# CLAUDE.md - AI Assistant Development Guide

**Project**: AppWhistler Production
**Purpose**: Truth-first app recommender platform with AI-powered fact-checking
**Last Updated**: 2025-11-21
**Repository**: appwhistler-production

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Repository Structure](#repository-structure)
3. [Technology Stack](#technology-stack)
4. [Architecture & Design Patterns](#architecture--design-patterns)
5. [Development Setup](#development-setup)
6. [Key Conventions](#key-conventions)
7. [Common Development Tasks](#common-development-tasks)
8. [Testing Strategy](#testing-strategy)
9. [Security Considerations](#security-considerations)
10. [Troubleshooting](#troubleshooting)
11. [Git Workflow](#git-workflow)
12. [AI Assistant Guidelines](#ai-assistant-guidelines)

---

## Project Overview

### What is AppWhistler?

AppWhistler is a full-stack web application that provides truth-verified app recommendations with AI-powered fact-checking. The platform allows users to:

- Browse and search verified applications
- View truth ratings and fact-checks
- Submit and read reviews
- Track app verification status in real-time
- Access GDPR/CCPA compliant privacy features

### Key Features

- **GraphQL API**: Single endpoint with strong typing for all operations
- **Real-time Updates**: WebSocket subscriptions for live fact-checks and verifications
- **Background Jobs**: Async processing for emails, blockchain operations, and AI fact-checking
- **Glassmorphism UI**: Modern, accessible design with dark/light mode support
- **Enterprise Security**: JWT auth, rate limiting, input validation, CORS, CSP headers
- **Scalable Architecture**: Connection pooling, DataLoader for N+1 prevention, Redis caching

### Project Stats

- **Total LOC**: ~4,531 lines (combined frontend + backend)
- **Frontend**: React SPA (~286 lines main component)
- **Backend**: Express + Apollo GraphQL (~2,605 lines)
- **Database**: PostgreSQL with SQLite fallback support
- **Dependencies**: 19 backend, 5 frontend production dependencies

---

## Repository Structure

```
appwhistler-production/
├── src/                          # Frontend React application
│   ├── apollo/
│   │   └── client.js            # Apollo Client with auth & WebSocket config
│   ├── graphql/
│   │   └── queries.js           # All GraphQL queries, mutations, subscriptions
│   ├── App.jsx                   # Main component (286 lines, all-in-one pattern)
│   ├── main.jsx                  # Application entry point with ApolloProvider
│   └── index.css                 # Global styles, Tailwind config, custom animations
│
├── backend/                      # Backend Node.js server
│   ├── middleware/               # Express middleware pipeline
│   │   ├── auth.js              # JWT authentication + OAuth2
│   │   ├── rateLimiter.js       # Per-user/IP rate limiting
│   │   ├── graphqlComplexity.js # Query complexity limits
│   │   └── upload.js            # File upload handling (multer)
│   │
│   ├── queues/                   # Background job processing (Bull/Redis)
│   │   ├── jobManager.js        # Job queue initialization
│   │   └── jobHandlers.js       # Email, blockchain, fact-check handlers
│   │
│   ├── routes/                   # REST API endpoints
│   │   ├── privacy.js           # GDPR/CCPA compliance (data export/deletion)
│   │   └── upload.js            # File upload endpoints (avatars, icons)
│   │
│   ├── utils/                    # Shared utilities
│   │   ├── validation.js        # Input validators (email, password, rating)
│   │   ├── sanitizer.js         # XSS prevention (plain text, rich text, JSON)
│   │   ├── errorHandler.js      # GraphQL error formatting
│   │   ├── dataLoader.js        # N+1 query prevention with DataLoader
│   │   ├── cacheManager.js      # Redis caching layer
│   │   ├── pagination.js        # Cursor-based pagination
│   │   ├── email.js             # Email service (SendGrid)
│   │   ├── ipfsUpload.js        # IPFS file storage
│   │   └── poolMonitor.js       # Database connection health monitoring
│   │
│   ├── premium/                  # Premium features
│   │   └── apiKeyManager.js     # API key generation & management
│   │
│   ├── server.js                 # Main Express server (315 lines)
│   ├── schema.js                 # GraphQL schema (479 lines, 6 types)
│   ├── resolvers.js              # GraphQL resolvers (1,811 lines, 54 operations)
│   └── package.json              # Backend dependencies
│
├── config/
│   └── secrets.js               # Centralized environment variable management
│
├── database/
│   ├── schema.sql               # PostgreSQL schema (106 lines, 4 tables, 15 indexes)
│   ├── seed.sql                 # Demo data for development
│   └── init.js                  # Database initialization script
│
├── .github/
│   └── copilot-instructions.md  # GitHub Copilot development guide
│
├── public/                       # Static assets served by Vite
├── index.html                    # HTML entry point
├── package.json                  # Frontend dependencies
├── vite.config.js               # Vite build configuration
├── tailwind.config.js           # Tailwind CSS configuration
├── postcss.config.js            # PostCSS configuration
├── .env                         # Environment variables (NOT committed)
└── .gitignore                   # Git ignore patterns
```

### Key File Reference

| File | Lines | Purpose |
|------|-------|---------|
| `backend/resolvers.js` | 1,811 | All GraphQL business logic |
| `backend/schema.js` | 479 | GraphQL type definitions |
| `backend/server.js` | 315 | Server initialization & middleware |
| `src/App.jsx` | 286 | Main React component (all-in-one) |
| `src/index.css` | 127 | Tailwind config & custom animations |
| `database/schema.sql` | 106 | Database schema & indexes |
| `config/secrets.js` | 176 | Environment variable management |

---

## Technology Stack

### Frontend Technologies

- **React 18.3.1**: Functional components with Hooks (useState, useEffect)
- **Vite 5.4.11**: Fast ESM-based build tool with HMR
- **Apollo Client 4.0.9**: GraphQL client with cache & subscriptions
  - `HttpLink`: Queries and mutations
  - `GraphQLWsLink`: WebSocket subscriptions
  - `InMemoryCache`: Client-side caching with type policies
- **Tailwind CSS 3.4.17**: Utility-first CSS with dark mode support
- **GraphQL-WS 6.0.6**: WebSocket protocol for GraphQL subscriptions

### Backend Technologies

- **Node.js**: JavaScript runtime (CommonJS modules)
- **Express 4.18.2**: Web application framework
- **Apollo Server Express 3.13.0**: GraphQL server
- **PostgreSQL (pg 8.11.3)**: Primary database with connection pooling
- **SQLite3 5.1.7**: Fallback database for development
- **Bull 4.12.2**: Redis-backed job queue (fallback to in-memory)
- **Socket.io 4.7.2**: WebSocket communication
- **JWT (jsonwebtoken 9.0.2)**: Token-based authentication
- **Bcrypt (bcryptjs 2.4.3)**: Password hashing
- **Helmet 7.1.0**: Security headers middleware
- **Sentry 7.108.0**: Error monitoring and performance tracking

### Development Tools

- **nodemon 3.0.3**: Backend auto-reload on file changes
- **PostCSS 8.4.49**: CSS processing with Autoprefixer
- **dotenv 16.3.1**: Environment variable management

---

## Architecture & Design Patterns

### Frontend Architecture

**Pattern**: Single-Page Application (SPA) with GraphQL-first data fetching

#### Component Structure

- **All-in-one pattern**: All components defined in `/src/App.jsx` (no component splitting)
- Components: `App`, `AppCard`, `AppIcon`, `AppCardSkeleton`
- **Rationale**: Simple project structure, reduces over-engineering for small component count

#### State Management

1. **Local State**: React `useState` hooks for UI state
   - `darkMode`: Theme preference
   - `searchQuery`: Search filter
   - `selectedCategory`: Category filter
   - `apps`: Application data (currently mock data)

2. **Global State**: Apollo Client cache + localStorage
   - `appwhistler_token`: JWT authentication token
   - `appwhistler_user`: User profile data
   - `darkMode`: Theme preference (persisted)

3. **Data Fetching**: Apollo Client GraphQL operations
   - Queries: `useQuery` hook for data fetching
   - Mutations: `useMutation` hook for data updates
   - Subscriptions: Real-time updates via WebSocket

#### Authentication Flow

```
User Login → GraphQL Mutation
    ↓
JWT Token Generated (backend)
    ↓
Token stored in localStorage
    ↓
Apollo authLink adds Bearer token to all requests
    ↓
Backend authenticateToken middleware validates
    ↓
User context available in all resolvers
```

### Backend Architecture

**Pattern**: Express middleware pipeline → GraphQL API → PostgreSQL

#### Request Flow

```
HTTP Request
    ↓
CORS validation (allowed origins)
    ↓
Helmet security headers (CSP, HSTS, XSS protection)
    ↓
Body parser (JSON, urlencoded)
    ↓
authenticateToken (JWT validation, sets req.user)
    ↓
perUserRateLimiter (tiered rate limits)
    ↓
Apollo GraphQL Server
    ↓
Resolver function (with context: pool, req, loaders, user)
    ↓
DataLoader (batch queries, cache)
    ↓
PostgreSQL (parameterized queries)
    ↓
Response (JSON)
```

#### GraphQL Schema Design

**Types** (6 custom types):
- `User`: User accounts with roles (user, moderator, admin)
- `App`: Applications with metadata and verification status
- `FactCheck`: AI-powered fact-check records
- `Review`: User reviews with ratings
- `Bounty`: Rewards for fact-checking contributions
- `BlockchainTransaction`: Blockchain verification records

**Operations**:
- **Queries** (28): Data fetching (apps, users, fact-checks, leaderboards)
- **Mutations** (26): Data modifications (auth, CRUD, voting, verification)
- **Subscriptions** (4): Real-time updates (factCheckAdded, appVerified)
- **Custom Scalars**: `DateTime`, `JSON`

**Query Complexity**: Maximum depth and cost limits enforced via `graphqlComplexity.js`

#### Database Access Patterns

1. **Connection Pooling**: PostgreSQL pool with 20 max connections
   ```javascript
   const pool = new Pool(getDatabaseConfig());
   ```

2. **N+1 Prevention**: DataLoader pattern for batch loading
   ```javascript
   context.loaders.userById.load(userId)  // Batches and caches
   ```

3. **Parameterized Queries**: Always use prepared statements
   ```javascript
   pool.query('SELECT * FROM users WHERE id = $1', [userId])  // ✅ SAFE
   pool.query(`SELECT * FROM users WHERE id = ${userId}`)     // ❌ SQL INJECTION
   ```

4. **Caching**: Redis-backed caching for trending queries
   ```javascript
   const cached = await cacheManager.get('trending-apps');
   ```

5. **Monitoring**: Pool health monitoring at `/health/db-pool`

#### Authentication & Authorization

**JWT-based Authentication**:
- Access tokens (7 day expiry, configurable)
- Refresh tokens (longer expiry)
- Token blacklisting for logout
- OAuth2 support (Google, prepared for GitHub/Twitter)
- MFA/2FA support (TOTP via speakeasy)

**Role-based Access Control**:
```javascript
// In resolvers
if (!context.user) throw new Error('Unauthorized');
if (context.user.role !== 'admin') throw new Error('Forbidden');
```

#### Background Job Processing

**Bull/BullMQ with Redis** (falls back to in-memory for dev):

```javascript
// Job types
jobManager.registerWorker('email-jobs', handleEmailJob);
jobManager.registerWorker('blockchain-jobs', handleBlockchainJob);
jobManager.registerWorker('fact-check-jobs', handleFactCheckJob);

// Adding jobs from resolvers
await jobManager.addJob('email', {
  to: user.email,
  subject: 'Welcome to AppWhistler',
  body: '...'
});
```

**Job Features**:
- Retry logic with exponential backoff
- Priority queuing
- Job progress tracking
- Dead letter queues for failed jobs

---

## Development Setup

### Prerequisites

- **Node.js**: v16+ (recommended v18+)
- **PostgreSQL**: v12+ (or SQLite3 for development)
- **Redis**: v6+ (optional, for job queues and caching)
- **npm**: v8+ (comes with Node.js)

### Initial Setup

```bash
# 1. Clone repository (if not already cloned)
git clone <repository-url>
cd appwhistler-production

# 2. Install frontend dependencies
npm install

# 3. Install backend dependencies
cd backend
npm install
cd ..

# 4. Setup environment variables
cp .env.example .env  # Or create .env manually
# Edit .env with your configuration (see Environment Variables section)

# 5. Initialize database
cd database
node init.js  # Creates schema and seeds demo data
cd ..

# 6. Verify setup
npm run dev  # Terminal 1: Start frontend (port 3000)
cd backend && npm start  # Terminal 2: Start backend (port 5000)
```

### Environment Variables

**Required Variables** (`.env` file):

```bash
# Server Configuration
NODE_ENV=development              # Environment: development|production
PORT=5000                         # Backend server port
API_VERSION=v1                    # API version prefix

# Database Configuration (PostgreSQL)
DB_HOST=localhost                 # Database host
DB_PORT=5432                      # Database port (PostgreSQL default)
DB_NAME=appwhistler               # Database name
DB_USER=postgres                  # Database username
DB_PASSWORD=postgres              # Database password (CHANGE IN PRODUCTION)

# Authentication
JWT_SECRET=your_strong_secret_key_change_in_production
JWT_EXPIRES_IN=7d                 # Token expiry (7 days)
REFRESH_TOKEN_SECRET=your_refresh_secret_change_in_production

# CORS (comma-separated origins)
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5000
```

**Optional Services**:

```bash
# Redis (for job queues and caching)
REDIS_URL=redis://localhost:6379

# Error Monitoring (Sentry)
SENTRY_DSN=https://your-sentry-dsn
SENTRY_TRACES_SAMPLE_RATE=0.1    # 10% of transactions

# Email Service (SendGrid)
SENDGRID_API_KEY=SG.your_api_key

# AI Fact-Checking (HuggingFace)
HUGGINGFACE_API_KEY=hf_your_api_key

# IPFS Storage (Pinata)
PINATA_API_KEY=your_pinata_key
PINATA_SECRET_KEY=your_pinata_secret

# Blockchain (Ethereum)
INFURA_PROJECT_ID=your_infura_id
ALCHEMY_API_KEY=your_alchemy_key
PRIVATE_KEY=your_wallet_private_key  # For blockchain transactions

# Database Alternatives
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_supabase_key
```

**Frontend Environment Variables** (Vite requires `VITE_` prefix):

```bash
VITE_API_URL=http://localhost:5000
VITE_WS_URL=ws://localhost:5000
VITE_SENTRY_DSN=https://your-sentry-dsn
VITE_SENTRY_TRACES_SAMPLE_RATE=0.1
```

### Development Commands

```bash
# Frontend (from root directory)
npm run dev      # Start Vite dev server (http://localhost:3000)
npm run build    # Production build to /dist
npm run preview  # Preview production build

# Backend (from backend/ directory)
npm start        # Start server with node
npm run dev      # Start with nodemon (auto-reload on file changes)

# Database (from database/ directory)
node init.js     # Initialize database schema and seed data
```

### Accessing the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **GraphQL Playground**: http://localhost:5000/graphql (development only)
- **Health Check**: http://localhost:5000/health
- **DB Pool Status**: http://localhost:5000/health/db-pool

---

## Key Conventions

### Code Style

#### Frontend Conventions

1. **Component Naming**: PascalCase for components
   ```javascript
   function AppCard({ app }) { }     // ✅ Component
   function formatDate(date) { }     // ✅ Utility function
   ```

2. **Props Destructuring**: Destructure props in function signature
   ```javascript
   function AppCard({ app, darkMode }) {  // ✅ Clear props
     // ...
   }
   ```

3. **State Naming**: Descriptive boolean states, use `is`/`has` prefix
   ```javascript
   const [darkMode, setDarkMode] = useState(false);      // ✅
   const [isLoading, setIsLoading] = useState(true);     // ✅
   const [hasError, setHasError] = useState(false);      // ✅
   ```

4. **Event Handlers**: Prefix with `handle` or `on`
   ```javascript
   const handleSearch = (query) => { };
   const toggleDarkMode = () => { };
   ```

#### Backend Conventions

1. **Resolver Structure**: Group by entity, order by Query → Mutation → Subscription
   ```javascript
   module.exports = {
     Query: {
       apps: async (_, { filters }, context) => { },
       app: async (_, { id }, context) => { },
     },
     Mutation: {
       createApp: async (_, { input }, context) => { },
     },
     Subscription: {
       appVerified: { subscribe: () => pubsub.asyncIterator(['APP_VERIFIED']) },
     },
   };
   ```

2. **Error Handling**: Use custom error handler
   ```javascript
   const { createGraphQLError } = require('./utils/errorHandler');

   if (!user) {
     throw createGraphQLError('User not found', 'NOT_FOUND');
   }
   ```

3. **Database Queries**: Always use parameterized queries
   ```javascript
   // ✅ SAFE - Parameterized query
   const result = await pool.query(
     'SELECT * FROM users WHERE email = $1',
     [email]
   );

   // ❌ DANGEROUS - SQL injection vulnerability
   const result = await pool.query(
     `SELECT * FROM users WHERE email = '${email}'`
   );
   ```

4. **Async/Await**: Prefer async/await over promise chains
   ```javascript
   // ✅ Readable
   const user = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
   const apps = await pool.query('SELECT * FROM apps WHERE user_id = $1', [id]);

   // ❌ Less readable
   pool.query('SELECT * FROM users WHERE id = $1', [id])
     .then(user => pool.query('SELECT * FROM apps WHERE user_id = $1', [id]))
     .then(apps => { });
   ```

### GraphQL Conventions

1. **Naming**: Use camelCase for fields, PascalCase for types
   ```graphql
   type User {
     firstName: String!      # ✅ camelCase
     created_at: DateTime    # ❌ snake_case
   }
   ```

2. **Nullability**: Be explicit about required fields
   ```graphql
   type App {
     id: ID!                # ✅ Always required
     name: String!          # ✅ Always required
     description: String    # ✅ Optional (can be null)
   }
   ```

3. **Input Types**: Use separate input types for mutations
   ```graphql
   input CreateAppInput {
     name: String!
     description: String
     category: String!
   }

   type Mutation {
     createApp(input: CreateAppInput!): App!
   }
   ```

### File Organization

1. **Frontend**: Single-file components (no splitting for this project)
   - All components in `src/App.jsx`
   - GraphQL queries in `src/graphql/queries.js`
   - Apollo config in `src/apollo/client.js`

2. **Backend**: Modular structure by concern
   - Middleware in `backend/middleware/`
   - Utilities in `backend/utils/`
   - Routes in `backend/routes/`
   - Job handlers in `backend/queues/`

### Styling Conventions

1. **Tailwind Classes**: Use consistent ordering
   ```jsx
   className="
     flex items-center justify-between    // Layout
     px-6 py-4                            // Spacing
     bg-white dark:bg-slate-900           // Background
     text-slate-800 dark:text-slate-100   // Text
     rounded-2xl                          // Border radius
     shadow-lg                            // Shadow
     hover:scale-110                      // Hover effects
     transition-all duration-300          // Transitions
   "
   ```

2. **Dark Mode**: Always provide dark mode variants
   ```jsx
   className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
   ```

3. **Custom Classes**: Define in `src/index.css` for reusable patterns
   ```css
   .glass {
     @apply backdrop-blur-xl bg-white/70 border border-white/30;
   }
   ```

---

## Common Development Tasks

### Adding a New GraphQL Query

1. **Define in Schema** (`backend/schema.js`):
   ```graphql
   type Query {
     searchApps(query: String!, category: String, limit: Int): [App!]!
   }
   ```

2. **Implement Resolver** (`backend/resolvers.js`):
   ```javascript
   Query: {
     searchApps: async (_, { query, category, limit = 10 }, { pool }) => {
       const result = await pool.query(
         'SELECT * FROM apps WHERE name ILIKE $1 AND category = $2 LIMIT $3',
         [`%${query}%`, category, limit]
       );
       return result.rows;
     },
   }
   ```

3. **Add Frontend Query** (`src/graphql/queries.js`):
   ```javascript
   export const SEARCH_APPS = gql`
     query SearchApps($query: String!, $category: String, $limit: Int) {
       searchApps(query: $query, category: $category, limit: $limit) {
         id
         name
         description
         truthRating
         category
       }
     }
   `;
   ```

4. **Use in Component** (`src/App.jsx`):
   ```javascript
   import { useQuery } from '@apollo/client';
   import { SEARCH_APPS } from './graphql/queries';

   function AppSearch() {
     const { data, loading, error } = useQuery(SEARCH_APPS, {
       variables: { query: 'facebook', category: 'social' }
     });

     if (loading) return <div>Loading...</div>;
     if (error) return <div>Error: {error.message}</div>;

     return <div>{data.searchApps.map(app => <AppCard key={app.id} app={app} />)}</div>;
   }
   ```

### Adding a New Database Table

1. **Update Schema** (`database/schema.sql`):
   ```sql
   CREATE TABLE IF NOT EXISTS notifications (
     id SERIAL PRIMARY KEY,
     user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
     message TEXT NOT NULL,
     is_read BOOLEAN DEFAULT FALSE,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );

   CREATE INDEX idx_notifications_user ON notifications(user_id);
   CREATE INDEX idx_notifications_read ON notifications(is_read);
   ```

2. **Run Migration**:
   ```bash
   cd database
   node init.js  # Re-runs schema (idempotent with IF NOT EXISTS)
   ```

3. **Add GraphQL Type** (`backend/schema.js`):
   ```graphql
   type Notification {
     id: ID!
     userId: ID!
     message: String!
     isRead: Boolean!
     createdAt: DateTime!
   }

   type Query {
     notifications(userId: ID!): [Notification!]!
   }
   ```

4. **Implement Resolver** (`backend/resolvers.js`):
   ```javascript
   Query: {
     notifications: async (_, { userId }, { pool, user }) => {
       if (!user || user.id !== userId) {
         throw new Error('Unauthorized');
       }
       const result = await pool.query(
         'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC',
         [userId]
       );
       return result.rows.map(row => ({
         id: row.id,
         userId: row.user_id,
         message: row.message,
         isRead: row.is_read,
         createdAt: row.created_at,
       }));
     },
   }
   ```

### Adding a Background Job

1. **Create Job Handler** (`backend/queues/jobHandlers.js`):
   ```javascript
   async function handleNotificationJob(job) {
     const { userId, message } = job.data;

     console.log(`Processing notification for user ${userId}`);

     // Store in database
     await pool.query(
       'INSERT INTO notifications (user_id, message) VALUES ($1, $2)',
       [userId, message]
     );

     // Send push notification, email, etc.

     return { success: true, userId };
   }
   ```

2. **Register Worker** (`backend/server.js`):
   ```javascript
   jobManager.registerWorker('notification-jobs', handleNotificationJob);
   ```

3. **Add Job from Resolver** (`backend/resolvers.js`):
   ```javascript
   Mutation: {
     createApp: async (_, { input }, { pool, user }) => {
       // ... create app logic ...

       // Queue background job
       await jobManager.addJob('notification', {
         userId: user.id,
         message: 'Your app has been created successfully!'
       });

       return app;
     },
   }
   ```

### Adding a Real-time Subscription

1. **Define Subscription** (`backend/schema.js`):
   ```graphql
   type Subscription {
     notificationReceived(userId: ID!): Notification!
   }
   ```

2. **Implement Resolver** (`backend/resolvers.js`):
   ```javascript
   const { PubSub } = require('graphql-subscriptions');
   const pubsub = new PubSub();

   module.exports = {
     Subscription: {
       notificationReceived: {
         subscribe: (_, { userId }, { user }) => {
           if (!user || user.id !== userId) {
             throw new Error('Unauthorized');
           }
           return pubsub.asyncIterator([`NOTIFICATION_${userId}`]);
         },
       },
     },

     Mutation: {
       createNotification: async (_, { userId, message }, { pool }) => {
         // ... create notification in DB ...

         // Publish to subscribers
         pubsub.publish(`NOTIFICATION_${userId}`, {
           notificationReceived: notification,
         });

         return notification;
       },
     },
   };
   ```

3. **Subscribe in Frontend** (`src/graphql/queries.js`):
   ```javascript
   export const NOTIFICATION_SUBSCRIPTION = gql`
     subscription OnNotificationReceived($userId: ID!) {
       notificationReceived(userId: $userId) {
         id
         message
         isRead
         createdAt
       }
     }
   `;
   ```

4. **Use in Component** (`src/App.jsx`):
   ```javascript
   import { useSubscription } from '@apollo/client';
   import { NOTIFICATION_SUBSCRIPTION } from './graphql/queries';

   function NotificationListener({ userId }) {
     const { data } = useSubscription(NOTIFICATION_SUBSCRIPTION, {
       variables: { userId }
     });

     useEffect(() => {
       if (data?.notificationReceived) {
         console.log('New notification:', data.notificationReceived);
         // Show toast, update UI, etc.
       }
     }, [data]);

     return null;
   }
   ```

### Adding Middleware

1. **Create Middleware File** (`backend/middleware/logger.js`):
   ```javascript
   function requestLogger(req, res, next) {
     const start = Date.now();

     res.on('finish', () => {
       const duration = Date.now() - start;
       console.log(`${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
     });

     next();
   }

   module.exports = requestLogger;
   ```

2. **Register in Server** (`backend/server.js`):
   ```javascript
   const requestLogger = require('./middleware/logger');

   // Add before routes (order matters!)
   app.use(requestLogger);
   ```

### Modifying the UI Design

1. **Update Tailwind Config** (`tailwind.config.js`):
   ```javascript
   module.exports = {
     theme: {
       extend: {
         colors: {
           brand: {
             primary: '#3B82F6',
             secondary: '#8B5CF6',
           },
         },
       },
     },
   };
   ```

2. **Add Custom Animations** (`src/index.css`):
   ```css
   @keyframes slideIn {
     from {
       transform: translateX(-100%);
       opacity: 0;
     }
     to {
       transform: translateX(0);
       opacity: 1;
     }
   }

   .animate-slide-in {
     animation: slideIn 0.3s ease-out;
   }
   ```

3. **Use in Components** (`src/App.jsx`):
   ```jsx
   <div className="bg-brand-primary animate-slide-in">
     Content
   </div>
   ```

---

## Testing Strategy

### Current Status

⚠️ **No testing infrastructure currently exists in the project.**

### Recommended Testing Setup

#### Frontend Testing (Vitest + React Testing Library)

```bash
# Install dependencies
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom

# Update package.json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  }
}
```

**Example Component Test** (`src/App.test.jsx`):
```javascript
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MockedProvider } from '@apollo/client/testing';
import App from './App';

describe('App Component', () => {
  it('renders the app title', () => {
    render(
      <MockedProvider>
        <App />
      </MockedProvider>
    );
    expect(screen.getByText('AppWhistler')).toBeInTheDocument();
  });

  it('toggles dark mode', () => {
    render(
      <MockedProvider>
        <App />
      </MockedProvider>
    );
    const darkModeButton = screen.getByRole('button', { name: /dark mode/i });
    fireEvent.click(darkModeButton);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });
});
```

#### Backend Testing (Jest + Supertest)

```bash
# Install dependencies
cd backend
npm install -D jest supertest

# Update package.json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

**Example Resolver Test** (`backend/resolvers.test.js`):
```javascript
const { ApolloServer } = require('apollo-server-express');
const typeDefs = require('./schema');
const resolvers = require('./resolvers');

describe('GraphQL Resolvers', () => {
  let server;

  beforeAll(() => {
    server = new ApolloServer({
      typeDefs,
      resolvers,
      context: () => ({
        pool: mockPool,
        user: { id: 1, role: 'user' },
      }),
    });
  });

  it('fetches trending apps', async () => {
    const result = await server.executeOperation({
      query: 'query { trendingApps(limit: 5) { id name truthRating } }',
    });

    expect(result.errors).toBeUndefined();
    expect(result.data.trendingApps).toHaveLength(5);
  });
});
```

#### E2E Testing (Playwright)

```bash
# Install Playwright
npm install -D @playwright/test
npx playwright install

# Create test
```

**Example E2E Test** (`e2e/app.spec.js`):
```javascript
import { test, expect } from '@playwright/test';

test('user can search for apps', async ({ page }) => {
  await page.goto('http://localhost:3000');

  await page.fill('input[placeholder="Search apps"]', 'facebook');
  await page.keyboard.press('Enter');

  await expect(page.locator('.app-card')).toContainText('Facebook');
});
```

### Testing Best Practices

1. **Test Coverage Goals**:
   - Unit tests: 80%+ coverage for utilities and resolvers
   - Integration tests: All API endpoints
   - E2E tests: Critical user flows (auth, search, review submission)

2. **Test Data**:
   - Use factories/fixtures for consistent test data
   - Seed test database separately from development DB
   - Clean up test data after each test

3. **Mocking**:
   - Mock external APIs (HuggingFace, SendGrid, etc.)
   - Use `MockedProvider` for Apollo Client tests
   - Mock Redis for job queue tests

---

## Security Considerations

### Authentication Security

1. **JWT Best Practices**:
   - Strong secret keys (minimum 32 characters, random)
   - Short expiry times (7 days or less)
   - Refresh token rotation
   - Token blacklisting on logout

2. **Password Security**:
   - Bcrypt hashing (10 rounds minimum)
   - Password strength validation (8+ chars, mixed case, numbers, symbols)
   - Rate limiting on login attempts

3. **OAuth2 Integration**:
   - Use official SDKs (Google, GitHub)
   - Validate state parameter
   - Store tokens securely

### Input Validation & Sanitization

**Always validate and sanitize user input:**

```javascript
const { validateEmail, validatePassword } = require('./utils/validation');
const { sanitizePlainText } = require('./utils/sanitizer');

// Validation (reject invalid input)
if (!validateEmail(email)) {
  throw new Error('Invalid email format');
}

// Sanitization (clean user input before storage)
const cleanName = sanitizePlainText(name);
```

**Common Validations**:
- Email: RFC-compliant format
- Password: 8+ chars, complexity requirements
- URLs: Valid HTTP/HTTPS only
- Numbers: Range validation (ratings 1-5, etc.)
- Text: Max length enforcement

### SQL Injection Prevention

**NEVER construct queries with string interpolation:**

```javascript
// ❌ VULNERABLE to SQL injection
const query = `SELECT * FROM users WHERE email = '${email}'`;
await pool.query(query);

// ✅ SAFE - Parameterized query
await pool.query('SELECT * FROM users WHERE email = $1', [email]);
```

### XSS Prevention

1. **Sanitize Rich Text**:
   ```javascript
   const { sanitizeRichText } = require('./utils/sanitizer');
   const cleanDescription = sanitizeRichText(description);
   ```

2. **Content Security Policy** (Helmet middleware):
   ```javascript
   helmet({
     contentSecurityPolicy: {
       directives: {
         defaultSrc: ["'self'"],
         scriptSrc: ["'self'"],
         styleSrc: ["'self'", "'unsafe-inline'"],
       },
     },
   })
   ```

3. **React Auto-escaping**: React escapes by default, but avoid `dangerouslySetInnerHTML`

### Rate Limiting

**Configured in `backend/middleware/rateLimiter.js`:**

- **Anonymous users**: 100 requests per 15 minutes (per IP)
- **Authenticated users**: 1000 requests per 15 minutes (per user ID)
- **Admin users**: 10,000 requests per 15 minutes

**Custom rate limits for specific routes:**
```javascript
const rateLimit = require('express-rate-limit');

const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many requests from this IP',
});

app.post('/api/v1/auth/register', strictLimiter, registerHandler);
```

### CORS Configuration

**Whitelist allowed origins:**

```javascript
// .env
ALLOWED_ORIGINS=https://appwhistler.com,https://www.appwhistler.com

// backend/server.js
const allowedOrigins = getArray('ALLOWED_ORIGINS', ',', []);
app.use(cors({
  origin: (origin, callback) => {
    if (allowedOrigins.includes(origin) || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
```

### Environment Variable Security

1. **Never commit secrets to Git**:
   - `.env` is in `.gitignore`
   - Use `.env.example` for documentation only

2. **Production Secret Management**:
   - Use AWS Secrets Manager, HashiCorp Vault, or similar
   - `config/secrets.js` is AWS-ready (see comments)

3. **Validate on Startup**:
   ```javascript
   const { validateSecrets } = require('../config/secrets');
   validateSecrets();  // Throws error if required secrets missing
   ```

### GDPR/CCPA Compliance

**Implemented endpoints** (`backend/routes/privacy.js`):

- `POST /api/v1/privacy/data-export`: Export all user data
- `POST /api/v1/privacy/data-deletion`: Request data deletion
- `GET /api/v1/privacy/status/:requestId`: Check request status

**Best Practices**:
- Collect only necessary data
- Provide clear privacy policy
- Allow users to download their data
- Honor deletion requests within 30 days
- Log consent for data processing

---

## Troubleshooting

### Backend Won't Start

**Problem**: Server crashes on startup

**Solutions**:
1. Check PostgreSQL is running:
   ```bash
   psql -U postgres -d appwhistler -h localhost
   ```

2. Verify environment variables:
   ```bash
   cd backend
   node -e "require('dotenv').config(); console.log(process.env.DB_HOST)"
   ```

3. Check database connection:
   ```bash
   curl http://localhost:5000/health/db-pool
   ```

4. Review error logs:
   ```bash
   cd backend
   npm start 2>&1 | tee error.log
   ```

### Frontend Can't Connect to Backend

**Problem**: Apollo Client errors, network failures

**Solutions**:
1. Verify backend is running:
   ```bash
   curl http://localhost:5000/health
   ```

2. Check CORS configuration:
   ```bash
   # In .env
   ALLOWED_ORIGINS=http://localhost:3000
   ```

3. Verify Apollo Client config (`src/apollo/client.js`):
   ```javascript
   const HTTP_URI = import.meta.env.VITE_API_URL || 'http://localhost:5000';
   ```

4. Check browser console for errors:
   - Open DevTools (F12)
   - Network tab: Check GraphQL requests
   - Console tab: Check for CORS errors

### Database Connection Pool Exhausted

**Problem**: "too many clients" error

**Solutions**:
1. Check pool health:
   ```bash
   curl http://localhost:5000/health/db-pool
   ```

2. Increase pool size (`config/secrets.js`):
   ```javascript
   max: 20,  // Increase to 50 if needed
   ```

3. Find long-running queries:
   ```sql
   SELECT pid, now() - query_start as duration, query
   FROM pg_stat_activity
   WHERE state != 'idle'
   ORDER BY duration DESC;
   ```

4. Ensure queries release connections (no dangling promises)

### WebSocket Subscription Not Working

**Problem**: Subscriptions timeout or don't receive updates

**Solutions**:
1. Verify WebSocket URL:
   ```javascript
   // .env
   VITE_WS_URL=ws://localhost:5000
   ```

2. Check firewall/proxy settings (WebSocket requires upgrade headers)

3. Test WebSocket connection:
   ```javascript
   const ws = new WebSocket('ws://localhost:5000/graphql');
   ws.onopen = () => console.log('Connected');
   ws.onerror = (e) => console.error('Error', e);
   ```

4. Verify subscription in backend resolvers

### Background Jobs Not Processing

**Problem**: Jobs stuck in queue, not executing

**Solutions**:
1. Check Redis connection:
   ```bash
   redis-cli ping  # Should return PONG
   ```

2. Verify worker registration (`backend/server.js`):
   ```javascript
   jobManager.registerWorker('email-jobs', handleEmailJob);
   ```

3. Monitor job queue:
   ```javascript
   const stats = await jobManager.getQueueStats('email-jobs');
   console.log(stats);  // { waiting, active, completed, failed }
   ```

4. Check job handler errors (Sentry or logs)

### Build Failures

**Problem**: `npm run build` fails

**Solutions**:
1. Clear node_modules and reinstall:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

2. Check Node.js version:
   ```bash
   node --version  # Should be v16+
   ```

3. Verify Tailwind config syntax:
   ```bash
   npx tailwindcss -c tailwind.config.js --check
   ```

4. Review Vite build logs for errors

### Dark Mode Not Persisting

**Problem**: Theme resets on page reload

**Solutions**:
1. Check localStorage in DevTools:
   ```javascript
   localStorage.getItem('darkMode')  // Should be 'true' or 'false'
   ```

2. Verify dark mode initialization (`src/App.jsx`):
   ```javascript
   useEffect(() => {
     const saved = localStorage.getItem('darkMode');
     if (saved === 'true') {
       setDarkMode(true);
       document.documentElement.classList.add('dark');
     }
   }, []);
   ```

3. Check Tailwind dark mode strategy (`tailwind.config.js`):
   ```javascript
   darkMode: 'class',  // Not 'media'
   ```

---

## Git Workflow

### Branch Strategy

**Main Branches**:
- `main` (or `master`): Production-ready code
- `develop`: Integration branch for features
- Feature branches: `claude/claude-md-mi9727wahw9sc013-*`

### Commit Conventions

**Format**: `<type>: <description>`

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code restructuring (no feature change)
- `style`: Formatting, whitespace
- `docs`: Documentation only
- `test`: Add or update tests
- `chore`: Maintenance tasks (deps, build, etc.)

**Examples**:
```bash
git commit -m "feat: add real-time notification subscriptions"
git commit -m "fix: resolve dark mode persistence issue"
git commit -m "refactor: extract DataLoader into separate utility"
git commit -m "docs: update CLAUDE.md with testing guidelines"
```

### Working with Claude Code

**Important Git Operations**:

1. **Always push to the correct branch**:
   ```bash
   git push -u origin claude/claude-md-mi9727wahw9sc013-01WjG7s2hah8fo3iAT8WHfh3
   ```

2. **Retry logic for network failures**:
   - Retry up to 4 times with exponential backoff (2s, 4s, 8s, 16s)
   - Applies to: `git push`, `git fetch`, `git pull`

3. **Creating commits**:
   ```bash
   # Check status
   git status
   git diff

   # Stage changes
   git add src/App.jsx backend/resolvers.js

   # Commit with message
   git commit -m "$(cat <<'EOF'
   feat: add user notification system

   - Add notifications table and GraphQL schema
   - Implement real-time subscription for notifications
   - Add UI components for notification display
   EOF
   )"
   ```

4. **Creating pull requests**:
   ```bash
   # Ensure changes are committed
   git status

   # Push to remote
   git push -u origin claude/feature-branch

   # Create PR via gh CLI
   gh pr create --title "Add user notification system" --body "$(cat <<'EOF'
   ## Summary
   - Implemented real-time notification system with GraphQL subscriptions
   - Added database schema and indexes
   - Built UI components with dark mode support

   ## Test Plan
   - [ ] Backend: Test notification creation and subscription
   - [ ] Frontend: Verify real-time updates in UI
   - [ ] Database: Check indexes and query performance
   EOF
   )"
   ```

### Pre-commit Checklist

Before committing, ensure:
- [ ] Code follows conventions in this document
- [ ] No console.log statements (use proper logging)
- [ ] No commented-out code (remove or document why)
- [ ] No hardcoded secrets or API keys
- [ ] All imports are used
- [ ] Code is formatted consistently
- [ ] GraphQL queries/mutations are tested
- [ ] Database migrations are idempotent (safe to re-run)

---

## AI Assistant Guidelines

### Understanding the Codebase

When asked to work on this project, first:

1. **Read this file completely** to understand architecture and conventions
2. **Check the specific files** mentioned in the user's request
3. **Use grep/find tools** to locate relevant code if unclear
4. **Review recent commits** to understand recent changes

### Communication Style

- **Be concise**: Users prefer brief, actionable responses
- **Show file paths with line numbers**: `src/App.jsx:45`
- **Use code blocks**: Always format code with proper syntax highlighting
- **Explain reasoning**: Brief comment on why you're taking an approach
- **Ask for clarification**: If requirements are ambiguous, ask before coding

### Code Generation Guidelines

1. **Follow existing patterns**: Match the style of surrounding code
2. **Use existing utilities**: Don't reinvent validation, sanitization, etc.
3. **Consider security**: Always validate input, use parameterized queries
4. **Handle errors gracefully**: Use try/catch, return meaningful errors
5. **Add comments for complex logic**: Explain why, not what
6. **Keep functions small**: Aim for < 50 lines per function
7. **Use descriptive names**: Prefer `createUserWithProfile` over `create`

### Common Pitfalls to Avoid

1. **❌ SQL Injection**: Never use string interpolation in queries
2. **❌ Missing Authentication**: Check `context.user` in protected resolvers
3. **❌ Blocking Operations**: Use async/await, don't block event loop
4. **❌ Memory Leaks**: Clean up subscriptions, close database connections
5. **❌ Overfetching**: Use DataLoader to batch queries
6. **❌ Exposing Secrets**: Never log or return sensitive data
7. **❌ CORS Issues**: Ensure frontend origin is in `ALLOWED_ORIGINS`
8. **❌ Missing Indexes**: Add indexes for frequently queried columns

### Testing Your Changes

Before submitting work:

1. **Start both servers**: Frontend and backend
2. **Test in browser**: Open http://localhost:3000
3. **Check console**: No errors in browser DevTools
4. **Test GraphQL**: Use GraphQL Playground at http://localhost:5000/graphql
5. **Verify database**: Check data in PostgreSQL
6. **Test edge cases**: Empty states, errors, invalid input
7. **Check dark mode**: Toggle and verify styles

### Documentation Updates

When adding features:

1. **Update this file** if architecture changes
2. **Add JSDoc comments** for exported functions
3. **Update GraphQL schema comments** for new types
4. **Add inline comments** for complex algorithms
5. **Update README.md** if user-facing features change

### Performance Considerations

1. **Use DataLoader**: Batch database queries to prevent N+1 issues
2. **Add indexes**: For columns used in WHERE, ORDER BY, JOIN
3. **Cache expensive operations**: Use Redis for trending queries
4. **Paginate results**: Don't return unbounded arrays
5. **Optimize images**: Compress and resize uploaded images
6. **Lazy load components**: Use React.lazy() for large components
7. **Monitor bundle size**: Keep frontend bundle < 500KB

### Debugging Tips

1. **Backend logs**: Check `console.log` output in terminal
2. **Sentry**: Review error reports if DSN configured
3. **GraphQL errors**: Check `errors` array in response
4. **Database queries**: Log queries with `pg.on('query', console.log)`
5. **Network tab**: Inspect GraphQL requests in DevTools
6. **Apollo DevTools**: Use browser extension for cache inspection
7. **React DevTools**: Inspect component state and props

### When to Ask for Help

Ask the user for clarification when:

1. **Requirements are ambiguous**: Multiple valid interpretations
2. **Breaking changes needed**: Will affect existing functionality
3. **External services required**: Need API keys or configuration
4. **Architecture decisions**: Multiple approaches with tradeoffs
5. **Security concerns**: Potential vulnerability in requirements
6. **Performance tradeoffs**: Optimization vs. code complexity

### Example Interaction Pattern

**User Request**: "Add a feature to let users bookmark apps"

**AI Assistant Response**:
```
I'll add a bookmarking feature for apps. Here's my approach:

1. Database: Add `bookmarks` table with user_id and app_id
2. GraphQL: Add `bookmarkApp` mutation and `bookmarks` query
3. Frontend: Add bookmark button to AppCard component
4. Real-time: Add subscription for bookmark updates (optional)

This will require changes to:
- database/schema.sql (new table + indexes)
- backend/schema.js (GraphQL types)
- backend/resolvers.js (bookmark mutations/queries)
- src/App.jsx (UI for bookmark button)
- src/graphql/queries.js (bookmark operations)

Should I proceed with this implementation?
```

**User**: "Yes, but skip the real-time subscription for now"

**AI Assistant**:
```
Got it, I'll implement bookmarking without subscriptions.

Starting with the database schema...
[Proceeds with implementation, showing code changes file-by-file]
```

---

## Additional Resources

### External Documentation

- **React**: https://react.dev/
- **Apollo Client**: https://www.apollographql.com/docs/react/
- **GraphQL**: https://graphql.org/learn/
- **Tailwind CSS**: https://tailwindcss.com/docs
- **Vite**: https://vitejs.dev/guide/
- **PostgreSQL**: https://www.postgresql.org/docs/
- **Express**: https://expressjs.com/en/guide/routing.html
- **Bull (Job Queue)**: https://github.com/OptimalBits/bull

### Internal Documentation

- `.github/copilot-instructions.md`: GitHub Copilot-specific guidance
- `README.md`: Basic project information
- `database/schema.sql`: Database schema with comments
- `backend/schema.js`: GraphQL schema definitions

### Useful Commands

```bash
# Development
npm run dev                          # Start frontend dev server
cd backend && npm run dev            # Start backend with nodemon

# Database
cd database && node init.js          # Initialize/reset database
psql -U postgres -d appwhistler      # Connect to PostgreSQL

# Testing (when implemented)
npm test                             # Run all tests
npm run test:watch                   # Watch mode
npm run test:coverage                # Generate coverage report

# Build
npm run build                        # Build frontend for production
npm run preview                      # Preview production build

# Debugging
curl http://localhost:5000/health    # Check backend health
curl http://localhost:5000/health/db-pool  # Database pool status
redis-cli ping                       # Check Redis connection

# Git
git status                           # Check working directory
git log --oneline -10                # Recent commits
git diff                             # Unstaged changes
```

---

## Changelog

**2025-11-21**: Initial CLAUDE.md creation
- Comprehensive documentation of architecture and conventions
- Development setup and workflow guide
- Security best practices and troubleshooting
- AI assistant guidelines and examples

---

## Contact & Support

For questions about this codebase:
1. Review this CLAUDE.md file first
2. Check `.github/copilot-instructions.md` for additional context
3. Review recent commits for implementation examples
4. Ask the project maintainer for clarification

**Remember**: This file should be kept up-to-date as the project evolves. When making significant architectural changes, update the relevant sections of this document.
