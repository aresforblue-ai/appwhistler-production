// src/backend/middleware/auth.js
// Complete authentication middleware with JWT and OAuth2

const jwt = require('jsonwebtoken');
const { GraphQLError } = require('graphql');
const { requireSecret, getSecret } = require('../../config/secrets');

const JWT_SECRET = requireSecret('JWT_SECRET');
const REFRESH_TOKEN_SECRET = getSecret('REFRESH_TOKEN_SECRET', JWT_SECRET);

/**
 * Middleware to verify JWT token from request headers
 * Attaches user data to request object if valid
 */
async function authenticateToken(req, res, next) {
  try {
    // Extract token from Authorization header
    // Format: "Bearer <token>"
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      req.user = null; // No token = not authenticated
      return next();
    }

    // Verify token signature and expiration
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Check if token is in blacklist (for logout functionality)
    const blacklisted = await checkTokenBlacklist(decoded.jti);
    if (blacklisted) {
      req.user = null;
      return next();
    }

    // Attach user info to request
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    }

    // Other errors
    console.error('Authentication error:', error);
    return res.status(500).json({ error: 'Authentication failed' });
  }
}

/**
 * Middleware to require authentication
 * Use this for protected routes
 */
function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ 
      error: 'Authentication required',
      code: 'UNAUTHENTICATED'
    });
  }
  next();
}

/**
 * Middleware to require specific role
 * @param {string|string[]} roles - Required role(s)
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'UNAUTHENTICATED'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        code: 'FORBIDDEN'
      });
    }

    next();
  };
}

/**
 * Generate JWT access token
 * @param {object} payload - User data to encode
 * @param {string} expiresIn - Token expiration (default: 7d)
 */
function generateAccessToken(payload, expiresIn = '7d') {
  return jwt.sign(
    {
      userId: payload.userId,
      email: payload.email,
      role: payload.role || 'user',
      jti: generateJTI() // Unique token ID for blacklisting
    },
    JWT_SECRET,
    { 
      expiresIn,
      issuer: 'appwhistler',
      audience: 'appwhistler-users'
    }
  );
}

/**
 * Generate refresh token (longer lived)
 * @param {object} payload - User data to encode
 */
function generateRefreshToken(payload) {
  return jwt.sign(
    {
      userId: payload.userId,
      type: 'refresh',
      jti: generateJTI()
    },
    REFRESH_TOKEN_SECRET,
    { 
      expiresIn: '30d',
      issuer: 'appwhistler'
    }
  );
}

/**
 * Verify refresh token and issue new access token
 * @param {string} refreshToken - The refresh token
 * @param {object} pool - Database connection pool
 */
async function refreshAccessToken(refreshToken, pool) {
  try {
    // Verify refresh token
    const decoded = jwt.verify(
      refreshToken, 
      REFRESH_TOKEN_SECRET
    );

    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }

    // Check if token is blacklisted
    const blacklisted = await checkTokenBlacklist(decoded.jti);
    if (blacklisted) {
      throw new Error('Token has been revoked');
    }

    // Get user from database
    const result = await pool.query(
      'SELECT id, email, role FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      throw new Error('User not found');
    }

    const user = result.rows[0];

    // Generate new access token
    const newAccessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role
    });

    return {
      accessToken: newAccessToken,
      user
    };
  } catch (error) {
    throw new GraphQLError('Invalid or expired refresh token', {
      extensions: { code: 'UNAUTHENTICATED' }
    });
  }
}

/**
 * Generate unique JWT ID for token tracking
 */
function generateJTI() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Check if token is blacklisted (for logout)
 * In production, use Redis for fast lookups
 */
async function checkTokenBlacklist(jti) {
  // Simple in-memory implementation (use Redis in production)
  if (!global.tokenBlacklist) {
    global.tokenBlacklist = new Set();
  }
  return global.tokenBlacklist.has(jti);
}

/**
 * Blacklist a token (logout functionality)
 * @param {string} jti - Token ID to blacklist
 */
async function blacklistToken(jti) {
  if (!global.tokenBlacklist) {
    global.tokenBlacklist = new Set();
  }
  global.tokenBlacklist.add(jti);
  
  // In production, store in Redis with TTL matching token expiration
  // await redisClient.setex(`blacklist:${jti}`, 604800, '1'); // 7 days
}

/**
 * OAuth2 helpers for third-party authentication
 */
const OAuth2 = {
  /**
   * Generate state parameter for OAuth flow (CSRF protection)
   */
  generateState() {
    return require('crypto').randomBytes(32).toString('hex');
  },

  /**
   * Verify state parameter
   */
  verifyState(received, stored) {
    return received === stored;
  },

  /**
   * Exchange OAuth code for user info (example for Google)
   * Adapt this for other providers (GitHub, Twitter, etc.)
   */
  async exchangeCodeForUser(code, provider) {
    // This is a template - implement based on OAuth provider docs
    
    if (provider === 'google') {
      // 1. Exchange code for access token
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          client_id: getSecret('GOOGLE_CLIENT_ID'),
          client_secret: getSecret('GOOGLE_CLIENT_SECRET'),
          redirect_uri: getSecret('GOOGLE_REDIRECT_URI'),
          grant_type: 'authorization_code'
        })
      });

      const { access_token } = await tokenResponse.json();

      // 2. Fetch user info
      const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${access_token}` }
      });

      const userData = await userResponse.json();

      return {
        email: userData.email,
        name: userData.name,
        picture: userData.picture,
        provider: 'google',
        providerId: userData.id
      };
    }

    throw new Error('Unsupported OAuth provider');
  }
};

/**
 * Multi-Factor Authentication (MFA) helpers
 */
const MFA = {
  /**
   * Generate TOTP secret for 2FA
   */
  generateSecret(userEmail) {
    const speakeasy = require('speakeasy'); // npm install speakeasy
    const secret = speakeasy.generateSecret({
      name: `AppWhistler (${userEmail})`,
      length: 32
    });
    return secret;
  },

  /**
   * Verify TOTP token
   */
  verifyToken(secret, token) {
    const speakeasy = require('speakeasy');
    return speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: token,
      window: 2 // Allow 2 time steps before/after
    });
  }
};

module.exports = {
  authenticateToken,
  requireAuth,
  requireRole,
  generateAccessToken,
  generateRefreshToken,
  refreshAccessToken,
  blacklistToken,
  OAuth2,
  MFA
};