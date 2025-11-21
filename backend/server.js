// src/backend/server.js
// Complete Express + GraphQL backend server for AppWhistler

// Import required packages
const express = require('express');
const { ApolloServer } = require('apollo-server-express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const { Pool } = require('pg');
const Sentry = require('@sentry/node');
require('dotenv').config();

const {
  loadSecrets,
  getSecret,
  getNumber,
  getArray,
  getDatabaseConfig
} = require('../config/secrets');

loadSecrets();

// Import utilities
const { validateEnvironment, printValidationResults, getFeatureFlags } = require('./utils/envValidator');
const { createBatchLoaders } = require('./utils/dataLoader');
const { authenticateToken } = require('./middleware/auth');
const { perUserRateLimiter } = require('./middleware/rateLimiter');
const PoolMonitor = require('./utils/poolMonitor');
const { createComplexityPlugin } = require('./middleware/graphqlComplexity');
const jobManager = require('./queues/jobManager');
const { handleEmailJob, handleBlockchainJob, handleFactCheckJob } = require('./queues/jobHandlers');
const createPrivacyRouter = require('./routes/privacy');

// Validate environment before starting
const validation = validateEnvironment();
if (!printValidationResults(validation)) {
  process.exit(1);
}

// Import GraphQL schema and resolvers
const typeDefs = require('./schema');
const resolvers = require('./resolvers');

// Initialize Express app
const app = express();
const httpServer = createServer(app);

// PostgreSQL connection pool (reuses connections for performance)
const pool = new Pool(getDatabaseConfig());
const poolMonitor = new PoolMonitor(pool);

const NODE_ENV = getSecret('NODE_ENV', 'development');
const SENTRY_DSN = getSecret('SENTRY_DSN');
const SENTRY_TRACES_SAMPLE_RATE = parseFloat(getSecret('SENTRY_TRACES_SAMPLE_RATE', '0.1'));

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: NODE_ENV,
    tracesSampleRate: Number.isFinite(SENTRY_TRACES_SAMPLE_RATE) ? SENTRY_TRACES_SAMPLE_RATE : 0.1
  });

  app.use(Sentry.Handlers.requestHandler());
  app.use(Sentry.Handlers.tracingHandler());
}

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
    process.exit(1); // Exit if database is unreachable
  }
  console.log('✅ Database connected at:', res.rows[0].now);
});

// Initialize background job queues and register workers
jobManager.registerWorker('email-jobs', handleEmailJob);
jobManager.registerWorker('blockchain-jobs', handleBlockchainJob);
jobManager.registerWorker('fact-check-jobs', handleFactCheckJob);

console.log('✅ Background job queues initialized');

// Middleware: Security headers (protects against common attacks)
const allowedOrigins = getArray('ALLOWED_ORIGINS', ',', [
  'http://localhost:3000',
  'http://localhost:5000'
]);

const cspDirectives = NODE_ENV === 'production' ? {
  defaultSrc: ["'self'"],
  scriptSrc: ["'self'"],
  styleSrc: ["'self'", "'unsafe-inline'"],
  imgSrc: ["'self'", 'data:', 'https:'],
  connectSrc: ["'self'", 'ws:', 'wss:', ...allowedOrigins],
  fontSrc: ["'self'", 'https:', 'data:'],
  frameAncestors: ["'none'"]
} : false;

app.use(helmet({
  contentSecurityPolicy: cspDirectives ? { directives: cspDirectives } : false,
  crossOriginEmbedderPolicy: false,
  referrerPolicy: { policy: 'no-referrer' },
  frameguard: { action: 'deny' },
  hsts: NODE_ENV === 'production' ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
  permittedCrossDomainPolicies: { value: 'none' }
}));

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Allow cookies for auth
}));

// Middleware: Parse JSON bodies
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Middleware: Authentication (populates req.user when token present)
app.use(authenticateToken);

// Middleware: Rate limiting (tiered per user/IP)
app.use('/api/', perUserRateLimiter);
app.use('/graphql', perUserRateLimiter);

// GDPR/CCPA compliance endpoints
app.use('/api/v1/privacy', createPrivacyRouter(pool));

// File upload endpoints
const uploadRouter = require('./routes/upload');
app.use('/api/v1/upload', uploadRouter);

// Health check endpoint (useful for monitoring)
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      version: getSecret('API_VERSION', 'v1')
    });
  } catch (error) {
    res.status(503).json({ 
      status: 'unhealthy', 
      error: 'Database unavailable' 
    });
  }
});

// Database pool health and diagnostics endpoint
app.get('/health/db-pool', (req, res) => {
  const { status, issues, diagnostics } = poolMonitor.getHealthStatus();
  
  const statusCode = status === 'healthy' ? 200 : status === 'degraded' ? 202 : 503;
  
  res.status(statusCode).json({
    status,
    issues,
    ...diagnostics
  });
});

// REST API example endpoint (for quick actions)
app.get('/api/v1/apps/trending', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, package_id, truth_rating, download_count
      FROM apps
      WHERE is_verified = true
      ORDER BY download_count DESC
      LIMIT 10
    `);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching trending apps:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Apollo GraphQL Server setup
const apolloServer = new ApolloServer({
  typeDefs,
  resolvers,
  plugins: [createComplexityPlugin()],
  context: ({ req }) => {
    // Initialize batch loaders for this request to prevent N+1 queries
    const loaders = createBatchLoaders(pool);
    
    // Make database pool and request available in all resolvers
    return { 
      pool, 
      req,
      loaders,
      user: req.user // Will be set by auth middleware
    };
  },
  formatError: (error) => {
    // Log errors but don't expose internal details to clients
    console.error('GraphQL Error:', error);
    return {
      message: error.message,
      code: error.extensions?.code || 'INTERNAL_SERVER_ERROR',
      statusCode: error.extensions?.statusCode || 500
    };
  },
  introspection: NODE_ENV !== 'production', // Disable in prod
  playground: NODE_ENV !== 'production',
});

// Start Apollo server and apply middleware
async function startApolloServer() {
  console.log('🔄 Starting Apollo Server...');
  await apolloServer.start();
  console.log('✅ Apollo Server started');
  
  apolloServer.applyMiddleware({ 
    app, 
    path: '/graphql',
    cors: false // Already handled above
  });
  console.log('✅ Apollo middleware applied to /graphql');
}

// WebSocket setup for real-time updates (e.g., live fact-check results)
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST']
  }
});

io.on('connection', (socket) => {
  console.log(`🔌 WebSocket connected: ${socket.id}`);
  
  // Example: Subscribe to fact-check updates
  socket.on('subscribe:factchecks', (category) => {
    socket.join(`factchecks:${category}`);
    console.log(`User subscribed to fact-checks: ${category}`);
  });
  
  socket.on('disconnect', () => {
    console.log(`🔌 WebSocket disconnected: ${socket.id}`);
  });
});

// Broadcast function (can be called from resolvers)
function broadcastFactCheck(category, data) {
  io.to(`factchecks:${category}`).emit('new-factcheck', data);
}

// Make broadcast available globally
global.broadcastFactCheck = broadcastFactCheck;

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await jobManager.close(); // Close job queues first
  await pool.end();
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// Start the server
const PORT = getNumber('PORT', 5000);

startApolloServer().then(() => {
  // Add error handlers AFTER Apollo middleware is mounted
  if (SENTRY_DSN) {
    app.use(Sentry.Handlers.errorHandler());
  }

  // 404 handler - must come after all route handlers
  app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
  });

  // Global error handler
  app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    if (SENTRY_DSN) {
      Sentry.captureException(err);
    }
    res.status(500).json({ 
      error: 'Internal server error',
      message: NODE_ENV === 'development' ? err.message : undefined
    });
  });

  httpServer.listen(PORT, () => {
    console.log(`
🚀 AppWhistler Server Ready!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 REST API:    http://localhost:${PORT}/api/v1
📍 GraphQL:     http://localhost:${PORT}/graphql
📍 WebSockets:  ws://localhost:${PORT}
📍 Health:      http://localhost:${PORT}/health
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Environment: ${NODE_ENV}
    `);
  });
}).catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

// Export for testing
module.exports = { app, pool };