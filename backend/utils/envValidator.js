// src/backend/utils/envValidator.js
// Validate environment configuration on startup

const { loadSecrets, getSecret } = require('../../config/secrets.cjs');
const path = require('path');

loadSecrets();

function hasValue(varName) {
  const value = getSecret(varName);
  return value !== undefined && value !== null && value !== '';
}

function getValue(varName, fallback = undefined) {
  const value = getSecret(varName, fallback);
  return value === undefined ? fallback : value;
}

/**
 * Validation helper functions
 */
const validators = {
  isValidUrl: (url) => {
    try {
      const parsed = new URL(url);
      return ['http:', 'https:', 'ws:', 'wss:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  },

  isValidPort: (port) => {
    const num = parseInt(port, 10);
    return !isNaN(num) && num > 0 && num <= 65535;
  },

  isValidEmail: (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  isValidDsn: (dsn) => {
    // Sentry DSN format: https://key@organization.ingest.sentry.io/project
    return validators.isValidUrl(dsn) && dsn.includes('sentry.io');
  },

  isWindowsPath: (str) => {
    // Check for Windows-style paths (C:\, D:\, etc.)
    return /^[a-zA-Z]:\\/.test(str);
  },

  hasValidWindowsPath: (str) => {
    if (!validators.isWindowsPath(str)) return true; // Not a Windows path, skip validation

    // Check for invalid Windows path characters
    const invalidChars = /[<>"|?*]/;
    return !invalidChars.test(str);
  },

  isWeakSecret: (secret) => {
    if (!secret) return true;

    // Check for common weak patterns
    const weakPatterns = [
      'dev_secret',
      'change_in_production',
      'password',
      'secret123',
      'test',
      'demo',
      '12345',
      'admin'
    ];

    const lowerSecret = secret.toLowerCase();
    return weakPatterns.some(pattern => lowerSecret.includes(pattern));
  },

  hasMinimumEntropy: (secret, minLength = 32) => {
    if (!secret) return false;
    if (secret.length < minLength) return false;

    // Check for character variety (at least 3 of: lowercase, uppercase, numbers, symbols)
    const hasLower = /[a-z]/.test(secret);
    const hasUpper = /[A-Z]/.test(secret);
    const hasNumber = /[0-9]/.test(secret);
    const hasSymbol = /[^a-zA-Z0-9]/.test(secret);

    const variety = [hasLower, hasUpper, hasNumber, hasSymbol].filter(Boolean).length;
    return variety >= 3;
  }
};

/**
 * Critical environment variables required for app to run
 */
const REQUIRED_ENV_VARS = {
  JWT_SECRET: 'For signing authentication tokens',
  DB_HOST: 'PostgreSQL host',
  DB_PORT: 'PostgreSQL port',
  DB_NAME: 'PostgreSQL database name',
  DB_USER: 'PostgreSQL user',
  DB_PASSWORD: 'PostgreSQL password',
  NODE_ENV: 'Application environment (development, staging, production)',
};

/**
 * Optional but recommended environment variables
 */
const RECOMMENDED_ENV_VARS = {
  HUGGINGFACE_API_KEY: 'For AI fact-checking features',
  INFURA_PROJECT_ID: 'For blockchain integration (or use ALCHEMY_API_KEY)',
  PORT: 'Server port (defaults to 5000)',
  ALLOWED_ORIGINS: 'CORS origins (comma-separated)',
  SENTRY_DSN: 'Optional DSN for Sentry error monitoring'
};

/**
 * Feature-dependent environment variables
 */
const CONDITIONAL_ENV_VARS = {
  // Blockchain
  BLOCKCHAIN_ENABLED: {
    vars: ['INFURA_PROJECT_ID', 'ALCHEMY_API_KEY'],
    atLeastOne: true,
    description: 'At least one of INFURA_PROJECT_ID or ALCHEMY_API_KEY is needed for blockchain features'
  },
  // AI features
  AI_FEATURES_ENABLED: {
    vars: ['HUGGINGFACE_API_KEY'],
    description: 'HUGGINGFACE_API_KEY is needed for AI fact-checking'
  },
  // Error monitoring
  ERROR_MONITORING_ENABLED: {
    vars: ['SENTRY_DSN'],
    description: 'Provide SENTRY_DSN to enable error monitoring via Sentry'
  }
};

/**
 * Validate all environment variables
 * @returns {object} { valid: boolean, errors: array, warnings: array }
 */
function validateEnvironment() {
  const errors = [];
  const warnings = [];
  const nodeEnv = getValue('NODE_ENV');
  const isProduction = nodeEnv === 'production';
  const isWindows = process.platform === 'win32';

  // Check required variables
  for (const [varName, description] of Object.entries(REQUIRED_ENV_VARS)) {
    if (!hasValue(varName)) {
      errors.push(`Missing required: ${varName} - ${description}`);
    }
  }

  // Check recommended variables
  for (const [varName, description] of Object.entries(RECOMMENDED_ENV_VARS)) {
    if (!hasValue(varName)) {
      warnings.push(`Missing recommended: ${varName} - ${description}`);
    }
  }

  // Check conditional variables
  for (const [featureName, config] of Object.entries(CONDITIONAL_ENV_VARS)) {
    if (config.atLeastOne) {
      const hasAny = config.vars.some(varName => hasValue(varName));
      if (!hasAny) {
        warnings.push(`${config.description}`);
      }
    } else {
      for (const varName of config.vars) {
        if (!hasValue(varName)) {
          warnings.push(`${featureName} disabled: ${varName} not set - ${config.description}`);
        }
      }
    }
  }

  // ===== Format Validation =====

  // Validate PORT
  const portValue = getValue('PORT');
  if (portValue) {
    if (!validators.isValidPort(portValue)) {
      errors.push('PORT must be a valid number between 1 and 65535');
    } else {
      const port = parseInt(portValue, 10);
      if (port < 1024 && !isProduction) {
        warnings.push(`PORT ${port} is in privileged range (< 1024), may require elevated permissions`);
      }
    }
  }

  // Validate DB_PORT
  const dbPort = getValue('DB_PORT');
  if (dbPort && !validators.isValidPort(dbPort)) {
    errors.push('DB_PORT must be a valid number between 1 and 65535');
  }

  // Validate NODE_ENV
  if (nodeEnv && !['development', 'staging', 'production'].includes(nodeEnv)) {
    errors.push('NODE_ENV must be one of: development, staging, production');
  }

  // Validate URLs
  const urlVars = {
    'SUPABASE_URL': getValue('SUPABASE_URL'),
    'REDIS_URL': getValue('REDIS_URL')
  };

  for (const [varName, value] of Object.entries(urlVars)) {
    if (value && !validators.isValidUrl(value)) {
      errors.push(`${varName} must be a valid URL (http://, https://, ws://, or wss://)`);
    }
  }

  // Validate Sentry DSN
  const sentryDsn = getValue('SENTRY_DSN');
  if (sentryDsn && !validators.isValidDsn(sentryDsn)) {
    warnings.push('SENTRY_DSN appears to be invalid (should be a Sentry.io URL)');
  }

  // Validate ALLOWED_ORIGINS format
  const allowedOrigins = getValue('ALLOWED_ORIGINS');
  if (allowedOrigins) {
    const origins = allowedOrigins.split(',').map(o => o.trim());
    for (const origin of origins) {
      if (origin && !validators.isValidUrl(origin)) {
        warnings.push(`ALLOWED_ORIGINS contains invalid URL: ${origin}`);
      }
    }
  }

  // ===== Security Validation =====

  // Check JWT_SECRET strength
  const jwtSecret = getValue('JWT_SECRET');
  if (jwtSecret) {
    if (jwtSecret.length < 32) {
      if (isProduction) {
        errors.push('JWT_SECRET must be at least 32 characters in production');
      } else {
        warnings.push('JWT_SECRET should be at least 32 characters (current: ' + jwtSecret.length + ')');
      }
    }

    if (validators.isWeakSecret(jwtSecret)) {
      if (isProduction) {
        errors.push('JWT_SECRET contains weak/default patterns - SECURITY RISK in production!');
      } else {
        warnings.push('JWT_SECRET contains weak/default patterns (dev_secret, test, etc.)');
      }
    }

    if (isProduction && !validators.hasMinimumEntropy(jwtSecret)) {
      warnings.push('JWT_SECRET lacks complexity - use mix of uppercase, lowercase, numbers, and symbols');
    }
  }

  // Check REFRESH_TOKEN_SECRET strength
  const refreshSecret = getValue('REFRESH_TOKEN_SECRET');
  if (refreshSecret) {
    if (isProduction && refreshSecret.length < 32) {
      errors.push('REFRESH_TOKEN_SECRET must be at least 32 characters in production');
    }

    if (isProduction && validators.isWeakSecret(refreshSecret)) {
      errors.push('REFRESH_TOKEN_SECRET contains weak/default patterns - SECURITY RISK!');
    }
  }

  // Check for default database password in production
  const dbPassword = getValue('DB_PASSWORD');
  if (isProduction && dbPassword) {
    const weakPasswords = ['postgres', 'password', 'admin', '12345', 'root'];
    if (weakPasswords.includes(dbPassword.toLowerCase())) {
      errors.push('DB_PASSWORD is using a common default password - CRITICAL SECURITY RISK!');
    }

    if (dbPassword.length < 16) {
      warnings.push('DB_PASSWORD should be at least 16 characters in production');
    }
  }

  // Warn about missing HTTPS in production ALLOWED_ORIGINS
  if (isProduction && allowedOrigins) {
    const origins = allowedOrigins.split(',').map(o => o.trim());
    const hasHttp = origins.some(o => o.startsWith('http://'));
    if (hasHttp) {
      warnings.push('ALLOWED_ORIGINS contains http:// URLs in production - consider using https:// only');
    }
  }

  // ===== Windows-Specific Path Validation =====

  if (isWindows) {
    const pathVars = {
      'DB_HOST': getValue('DB_HOST'),
      'UPLOAD_PATH': getValue('UPLOAD_PATH'),
      'LOG_PATH': getValue('LOG_PATH')
    };

    for (const [varName, value] of Object.entries(pathVars)) {
      if (value && !validators.hasValidWindowsPath(value)) {
        errors.push(`${varName} contains invalid Windows path characters (<>"|?*)`);
      }
    }

    // Warn about forward slashes in paths on Windows
    const dbHost = getValue('DB_HOST');
    if (dbHost && dbHost.includes('/') && !dbHost.includes(':')) {
      warnings.push('DB_HOST contains forward slashes - on Windows, use backslashes or hostname instead');
    }
  }

  // ===== Production-Specific Validation =====

  if (isProduction) {
    // Ensure monitoring is configured
    if (!hasValue('SENTRY_DSN')) {
      warnings.push('No error monitoring configured (SENTRY_DSN) - recommended for production');
    }

    // Ensure CORS is properly configured
    if (!hasValue('ALLOWED_ORIGINS')) {
      errors.push('ALLOWED_ORIGINS must be set in production for security');
    }

    // Check for localhost in production origins
    if (allowedOrigins && allowedOrigins.includes('localhost')) {
      warnings.push('ALLOWED_ORIGINS contains localhost in production - this may be unintentional');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    hasWarnings: warnings.length > 0
  };
}

/**
 * Print environment validation results
 * @param {object} validation - Result from validateEnvironment()
 */
function printValidationResults(validation) {
  if (validation.errors.length > 0) {
    console.error('\n🚨 ENVIRONMENT VALIDATION FAILED\n');
    validation.errors.forEach(err => console.error(`  ❌ ${err}`));
    console.error('\n');
    return false;
  }

  if (validation.hasWarnings) {
    console.warn('\n⚠️  ENVIRONMENT WARNINGS\n');
    validation.warnings.forEach(warn => console.warn(`  ⚠️  ${warn}`));
    console.warn('\n');
  }

  console.log('✅ Environment validation passed\n');
  return true;
}

/**
 * Validate environment and exit process if critical errors found
 * This function should be called during server startup to ensure
 * all required environment variables are properly configured.
 *
 * Behavior:
 * - If validation fails (critical errors): Logs errors and exits with code 1
 * - If validation passes with warnings: Logs warnings and continues
 * - If validation passes cleanly: Logs success and continues
 */
function validateEnvironmentOrExit() {
  const validation = validateEnvironment();

  if (!validation.valid) {
    console.error('❌ Environment validation failed:');
    validation.errors.forEach(err => console.error(`  - ${err}`));

    if (validation.warnings.length > 0) {
      console.error('\nAdditional warnings:');
      validation.warnings.forEach(warn => console.error(`  - ${warn}`));
    }

    console.error('\n💡 Please check your .env file and ensure all required variables are set correctly.\n');
    process.exit(1);
  }

  if (validation.warnings.length > 0) {
    console.warn('⚠️  Environment warnings:');
    validation.warnings.forEach(warn => console.warn(`  - ${warn}`));
    console.warn('');
  }

  console.log('✅ Environment validation passed');
}

/**
 * Get sensitive features status based on env vars
 * @returns {object} Feature flags
 */
function getFeatureFlags() {
  return {
    blockchain_enabled: Boolean(getValue('INFURA_PROJECT_ID') || getValue('ALCHEMY_API_KEY')),
    ai_fact_checking_enabled: Boolean(getValue('HUGGINGFACE_API_KEY')),
    error_monitoring_enabled: Boolean(getValue('SENTRY_DSN')),
    production_mode: getValue('NODE_ENV') === 'production',
    debug_mode: getValue('NODE_ENV') === 'development'
  };
}

module.exports = {
  validateEnvironment,
  validateEnvironmentOrExit,
  printValidationResults,
  getFeatureFlags,
  REQUIRED_ENV_VARS,
  RECOMMENDED_ENV_VARS,
  CONDITIONAL_ENV_VARS,
  validators  // Export validators for testing/reuse
};
