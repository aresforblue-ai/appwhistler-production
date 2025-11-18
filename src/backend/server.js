// src/backend/server.js
// Complete Express + GraphQL backend server for AppWhistler

// Import required packages
const express = require('express');
const { ApolloServer } = require('apollo-server-express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { Pool } = require('pg');
require('dotenv').config();

// Import GraphQL schema and resolvers
const typeDefs = require('./schema');
const resolvers = require('./resolvers');

// Initialize Express app
const app = express();
const httpServer = createServer(app);

// PostgreSQL connection pool (reuses connections for performance)
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'appwhistler',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  max: 20, // Maximum 20 connections
  idleTimeoutMillis: 30000, // Close idle connections after 30s
  connectionTimeoutMillis: 2000, // Timeout after 2s if can't connect
});

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
    process.exit(1); // Exit if database is unreachable
  }
  console.log('✅ Database connected at:', res.rows[0].now);
});

// Middleware: Security headers (protects against common attacks)
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production',
  crossOriginEmbedderPolicy: false,
}));

// Middleware: CORS (allows frontend to access API)
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
  'http://localhost:3000',
  'http://localhost:5000'
];

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

// Middleware: Rate limiting (prevents abuse)
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || 15) * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || 100), // 100 requests per window
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Middleware: Parse JSON bodies
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint (useful for monitoring)
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      version: process.env.API_VERSION || 'v1'
    });
  } catch (error) {
    res.status(503).json({ 
      status: 'unhealthy', 
      error: 'Database unavailable' 
    });
  }
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
  context: ({ req }) => {
    // Make database pool and request available in all resolvers
    return { 
      pool, 
      req,
      user: req.user // Will be set by auth middleware
    };
  },
  formatError: (error) => {
    // Log errors but don't expose internal details to clients
    console.error('GraphQL Error:', error);
    return {
      message: error.message,
      code: error.extensions?.code || 'INTERNAL_SERVER_ERROR'
    };
  },
  introspection: process.env.NODE_ENV !== 'production', // Disable in prod
  playground: process.env.NODE_ENV !== 'production',
});

// Start Apollo server and apply middleware
async function startApolloServer() {
  await apolloServer.start();
  apolloServer.applyMiddleware({ 
    app, 
    path: '/graphql',
    cors: false // Already handled above
  });
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

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await pool.end();
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// Start the server
const PORT = process.env.PORT || 5000;

startApolloServer().then(() => {
  httpServer.listen(PORT, () => {
    console.log(`
🚀 AppWhistler Server Ready!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 REST API:    http://localhost:${PORT}/api/v1
📍 GraphQL:     http://localhost:${PORT}/graphql
📍 WebSockets:  ws://localhost:${PORT}
📍 Health:      http://localhost:${PORT}/health
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Environment: ${process.env.NODE_ENV || 'development'}
    `);
  });
}).catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

// Export for testing
module.exports = { app, pool };