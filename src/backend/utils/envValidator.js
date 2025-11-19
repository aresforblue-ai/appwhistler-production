// src/backend/utils/envValidator.js
// Validate environment configuration on startup

const { loadSecrets, getSecret } = require('../../config/secrets');

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
  }
};

/**
 * Validate all environment variables
 * @returns {object} { valid: boolean, errors: array, warnings: array }
 */
function validateEnvironment() {
  const errors = [];
  const warnings = [];
  
  // Check required variables
  for (const [varName, description] of Object.entries(REQUIRED_ENV_VARS)) {
    if (!hasValue(varName)) {
      errors.push(`❌ Missing required: ${varName} - ${description}`);
    }
  }
  
  // Check recommended variables
  for (const [varName, description] of Object.entries(RECOMMENDED_ENV_VARS)) {
    if (!hasValue(varName)) {
      warnings.push(`⚠️  Missing recommended: ${varName} - ${description}`);
    }
  }
  
  // Check conditional variables
  for (const [featureName, config] of Object.entries(CONDITIONAL_ENV_VARS)) {
    if (config.atLeastOne) {
      const hasAny = config.vars.some(varName => hasValue(varName));
      if (!hasAny) {
        warnings.push(`⚠️  ${config.description}`);
      }
    } else {
      for (const varName of config.vars) {
        if (!hasValue(varName)) {
          warnings.push(`⚠️  ${featureName} disabled: ${varName} not set - ${config.description}`);
        }
      }
    }
  }
  
  // Validate port number if set
  const portValue = getValue('PORT');
  if (portValue && Number.isNaN(parseInt(portValue, 10))) {
    errors.push('❌ PORT must be a valid number');
  }
  
  // Validate NODE_ENV
  const nodeEnv = getValue('NODE_ENV');
  if (nodeEnv && !['development', 'staging', 'production'].includes(nodeEnv)) {
    errors.push('❌ NODE_ENV must be one of: development, staging, production');
  }
  
  // Validate JWT_SECRET strength in production
  if (nodeEnv === 'production') {
    const jwtSecret = getValue('JWT_SECRET');
    if (jwtSecret && jwtSecret.length < 32) {
      errors.push('❌ JWT_SECRET should be at least 32 characters in production');
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
    validation.errors.forEach(err => console.error(err));
    console.error('\n');
    return false;
  }
  
  if (validation.hasWarnings) {
    console.warn('\n⚠️  ENVIRONMENT WARNINGS\n');
    validation.warnings.forEach(warn => console.warn(warn));
    console.warn('\n');
  }
  
  console.log('\n✅ Environment validation passed\n');
  return true;
}

/**
 * Get sensitive features status based on env vars
 * @returns {object} Feature flags
 */
function getFeatureFlags() {
  return {
    blockchain_enabled: Boolean(getValue('INFURA_PROJECT_ID') || getValue('ALCHEMY_API_KEY')),
    ai_fact_checking_enabled: Boolean(getValue('HUGGINGFACE_API_KEY')),
    production_mode: getValue('NODE_ENV') === 'production',
    debug_mode: getValue('NODE_ENV') === 'development'
  };
}

module.exports = {
  validateEnvironment,
  printValidationResults,
  getFeatureFlags,
  REQUIRED_ENV_VARS,
  RECOMMENDED_ENV_VARS,
  CONDITIONAL_ENV_VARS
};
