// config/secrets.js
// Enterprise Secrets Management - AWS-Ready Architecture
// Currently uses .env, easily upgrades to AWS Secrets Manager

require('dotenv').config();

// Secret cache (prevents repeated AWS API calls in production)
const secretCache = new Map();
const CACHE_TTL = 300000; // 5 minutes

/**
 * Load secrets from environment or AWS Secrets Manager
 * In production, swap this implementation to use AWS SDK
 */
async function loadSecretsFromSource() {
  // CURRENT: Load from .env file
  // FUTURE: Replace with AWS Secrets Manager API call
  // const AWS = require('aws-sdk');
  // const client = new AWS.SecretsManager({ region: 'us-east-1' });
  // const data = await client.getSecretValue({ SecretId: 'appwhistler/prod' }).promise();
  // return JSON.parse(data.SecretString);

  return {
    // Server
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: process.env.PORT || '5000',
    API_VERSION: process.env.API_VERSION || 'v1',

    // Database
    DB_HOST: process.env.DB_HOST || 'localhost',
    DB_PORT: process.env.DB_PORT || '5432',
    DB_NAME: process.env.DB_NAME || 'appwhistler',
    DB_USER: process.env.DB_USER || 'postgres',
    DB_PASSWORD: process.env.DB_PASSWORD || 'postgres',

    // Auth
    JWT_SECRET: process.env.JWT_SECRET || 'dev_secret_CHANGE_IN_PRODUCTION',
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
    REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET || 'refresh_dev_secret',

    // CORS
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:5000',

    // Monitoring
    SENTRY_DSN: process.env.SENTRY_DSN || '',
    SENTRY_TRACES_SAMPLE_RATE: process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1',

    // Optional Services
    SUPABASE_URL: process.env.SUPABASE_URL || '',
    SUPABASE_KEY: process.env.SUPABASE_KEY || '',
  };
}

/**
 * Initialize secrets on startup
 */
let secretsPromise = null;
function loadSecrets() {
  if (!secretsPromise) {
    secretsPromise = loadSecretsFromSource().then(secrets => {
      secretCache.set('secrets', {
        data: secrets,
        timestamp: Date.now()
      });
      return secrets;
    });
  }
  return secretsPromise;
}

/**
 * Get a secret value with caching
 * @param {string} key - Secret key
 * @param {*} defaultValue - Default if not found
 */
function getSecret(key, defaultValue = null) {
  const cached = secretCache.get('secrets');
  
  if (!cached || Date.now() - cached.timestamp > CACHE_TTL) {
    // Cache expired, return default (async refresh happens in background)
    loadSecrets();
    return process.env[key] || defaultValue;
  }
  
  return cached.data[key] !== undefined ? cached.data[key] : defaultValue;
}

/**
 * Get secret as number
 */
function getNumber(key, defaultValue = 0) {
  const value = getSecret(key, defaultValue);
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Get secret as boolean
 */
function getBoolean(key, defaultValue = false) {
  const value = getSecret(key, String(defaultValue));
  return value === 'true' || value === '1' || value === 'yes';
}

/**
 * Get secret as array (comma-separated)
 */
function getArray(key, separator = ',', defaultValue = []) {
  const value = getSecret(key);
  if (!value) return defaultValue;
  return value.split(separator).map(v => v.trim()).filter(Boolean);
}

/**
 * Require a secret value (throws error if not found)
 * @param {string} key - Secret key
 * @throws {Error} If secret is not found
 */
function requireSecret(key) {
  const value = getSecret(key);
  if (!value) {
    throw new Error(`Required secret '${key}' is not defined in environment variables`);
  }
  return value;
}

/**
 * Get database configuration object
 */
function getDatabaseConfig() {
  return {
    host: getSecret('DB_HOST', 'localhost'),
    port: getNumber('DB_PORT', 5432),
    database: getSecret('DB_NAME', 'appwhistler'),
    user: getSecret('DB_USER', 'postgres'),
    password: getSecret('DB_PASSWORD', 'postgres'),
    max: 20, // Connection pool size
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  };
}

/**
 * Validate required secrets on startup
 */
function validateSecrets() {
  const required = ['DB_HOST', 'DB_NAME', 'DB_USER', 'JWT_SECRET'];
  const missing = [];

  for (const key of required) {
    if (!getSecret(key)) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    throw new Error(`Missing required secrets: ${missing.join(', ')}`);
  }

  // Warn about insecure defaults in production
  if (getSecret('NODE_ENV') === 'production') {
    const insecure = [];
    
    if (getSecret('JWT_SECRET', '').includes('dev_secret')) {
      insecure.push('JWT_SECRET contains default value');
    }
    if (getSecret('DB_PASSWORD') === 'postgres') {
      insecure.push('DB_PASSWORD is default');
    }

    if (insecure.length > 0) {
      console.warn('⚠️  SECURITY WARNING:', insecure.join(', '));
    }
  }

  return true;
}

// Export functions
module.exports = {
  loadSecrets,
  getSecret,
  getNumber,
  getBoolean,
  getArray,
  requireSecret,
  getDatabaseConfig,
  validateSecrets,
};
