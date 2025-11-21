// src/backend/utils/errorHandler.js
// Standardized error handling and logging

const { GraphQLError } = require('graphql');
const { loadSecrets, getSecret } = require('../../config/secrets');

loadSecrets();

const isDevelopment = () => getSecret('NODE_ENV', 'development') === 'development';

// Error codes and their associated HTTP status codes
const ERROR_CODES = {
  // Authentication errors (4xx)
  UNAUTHENTICATED: { statusCode: 401, message: 'Authentication required' },
  UNAUTHORIZED: { statusCode: 403, message: 'Insufficient permissions' },
  INVALID_TOKEN: { statusCode: 401, message: 'Invalid or expired token' },
  TOKEN_EXPIRED: { statusCode: 401, message: 'Token has expired' },
  ACCOUNT_LOCKED: { statusCode: 423, message: 'Account temporarily locked' },
  
  // Input/Validation errors (4xx)
  BAD_USER_INPUT: { statusCode: 400, message: 'Invalid input provided' },
  VALIDATION_ERROR: { statusCode: 400, message: 'Validation failed' },
  INVALID_EMAIL: { statusCode: 400, message: 'Invalid email format' },
  INVALID_PASSWORD: { statusCode: 400, message: 'Invalid password' },
  
  // Resource errors (4xx)
  NOT_FOUND: { statusCode: 404, message: 'Resource not found' },
  ALREADY_EXISTS: { statusCode: 409, message: 'Resource already exists' },
  CONFLICT: { statusCode: 409, message: 'Resource conflict' },
  
  // Rate limiting (4xx)
  RATE_LIMITED: { statusCode: 429, message: 'Too many requests, please try again later' },
  
  // Server errors (5xx)
  INTERNAL_SERVER_ERROR: { statusCode: 500, message: 'Internal server error' },
  DATABASE_ERROR: { statusCode: 500, message: 'Database operation failed' },
  EXTERNAL_SERVICE_ERROR: { statusCode: 503, message: 'External service unavailable' },
  AI_SERVICE_ERROR: { statusCode: 503, message: 'AI service temporarily unavailable' },
};

/**
 * Create standardized GraphQL error
 * @param {string} message - Error message
 * @param {string} code - Error code (from ERROR_CODES)
 * @param {object} details - Additional error details
 * @returns {GraphQLError}
 */
function createGraphQLError(message, code = 'INTERNAL_SERVER_ERROR', details = {}) {
  const errorInfo = ERROR_CODES[code] || { statusCode: 500, message: 'Internal server error' };
  
  return new GraphQLError(message || errorInfo.message, {
    extensions: {
      code,
      statusCode: errorInfo.statusCode,
      ...details
    }
  });
}

/**
 * Handle validation errors (from validateInput)
 * @param {object} validationResult - Result from validateInput()
 * @param {string} context - Where validation failed (for logging)
 * @returns {GraphQLError|null}
 */
function handleValidationErrors(validationResult, context = 'mutation') {
  if (!validationResult.valid) {
    const errorMessages = Object.entries(validationResult.errors)
      .map(([field, msg]) => `${field}: ${msg}`)
      .join('; ');
    
    return createGraphQLError(
      `Validation failed: ${errorMessages}`,
      'VALIDATION_ERROR',
      { fields: validationResult.errors }
    );
  }
  
  return null;
}

/**
 * Safe database operation with error handling
 * @param {function} operation - Async function to execute
 * @param {string} operationName - Name for logging
 * @param {object} logger - Logger instance (optional)
 * @returns {Promise<any>}
 */
async function safeDatabaseOperation(operation, operationName = 'Database Operation', logger) {
  try {
    const result = await operation();
    return result;
  } catch (error) {
    const errorMessage = `${operationName} failed: ${error.message}`;
    
    if (logger) {
      logger.error(errorMessage, { error, operation: operationName });
    } else {
      console.error(errorMessage);
    }
    
    // Don't expose internal details to client
    throw createGraphQLError(
      'A database error occurred. Please try again later.',
      'DATABASE_ERROR'
    );
  }
}

/**
 * Handle async resolvers with automatic error catching
 * @param {function} resolver - Resolver function
 * @returns {function} Wrapped resolver
 */
function withErrorHandling(resolver) {
  return async (parent, args, context, info) => {
    try {
      return await resolver(parent, args, context, info);
    } catch (error) {
      if (error instanceof GraphQLError) {
        throw error;
      }
      
      console.error('Resolver error:', {
        resolver: info.fieldName,
        error: error.message,
        stack: error.stack
      });
      
      throw createGraphQLError(
        'An unexpected error occurred',
        'INTERNAL_SERVER_ERROR'
      );
    }
  };
}

/**
 * Format error for API response (non-GraphQL)
 * @param {Error} error - Error object
 * @param {string} code - Error code
 * @returns {object}
 */
function formatErrorResponse(error, code = 'INTERNAL_SERVER_ERROR') {
  const errorInfo = ERROR_CODES[code] || { statusCode: 500, message: 'Internal server error' };
  
  return {
    success: false,
    error: {
      message: error?.message || errorInfo.message,
      code,
      statusCode: errorInfo.statusCode,
      ...(isDevelopment() && { stack: error?.stack })
    }
  };
}

/**
 * Logging helper
 * @param {string} level - 'info', 'warn', 'error'
 * @param {string} message
 * @param {object} context - Additional context to log
 */
function logEvent(level = 'info', message, context = {}) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    ...context
  };
  
  if (isDevelopment()) {
    console.log(JSON.stringify(logEntry, null, 2));
  } else {
    console.log(JSON.stringify(logEntry));
  }
}

module.exports = {
  ERROR_CODES,
  createGraphQLError,
  handleValidationErrors,
  safeDatabaseOperation,
  withErrorHandling,
  formatErrorResponse,
  logEvent
};
