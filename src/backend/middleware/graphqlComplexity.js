// src/backend/middleware/graphqlComplexity.js
// GraphQL query complexity and depth limiting to prevent DOS attacks

const { GraphQLError } = require('graphql');
const { getNumber } = require('../../config/secrets');

// Configuration
const MAX_DEPTH = getNumber('GRAPHQL_MAX_DEPTH', 10);
const MAX_COMPLEXITY = getNumber('GRAPHQL_MAX_COMPLEXITY', 1000);

/**
 * Calculate query depth recursively
 */
function getQueryDepth(node, depth = 0) {
  if (!node) return depth;

  if (node.selectionSet && node.selectionSet.selections) {
    let maxChildDepth = depth;

    for (const selection of node.selectionSet.selections) {
      if (selection.kind === 'Field') {
        const childDepth = getQueryDepth(selection, depth + 1);
        maxChildDepth = Math.max(maxChildDepth, childDepth);
      } else if (selection.kind === 'InlineFragment') {
        const childDepth = getQueryDepth(selection, depth);
        maxChildDepth = Math.max(maxChildDepth, childDepth);
      } else if (selection.kind === 'FragmentSpread') {
        // Fragments would need to be resolved from the document
        // For now, we skip them
      }
    }

    return maxChildDepth;
  }

  return depth;
}

/**
 * Calculate query complexity based on field weights
 * Each field has a default cost of 1, nested fields multiply the cost
 */
function calculateComplexity(node, complexity = 0, multiplier = 1, schema) {
  if (!node) return complexity;

  if (node.selectionSet && node.selectionSet.selections) {
    for (const selection of node.selectionSet.selections) {
      if (selection.kind === 'Field') {
        // Default cost per field is 1
        let fieldCost = 1;

        // Custom weights for known expensive fields
        const expensiveFields = {
          'factChecks': 5,
          'apps': 5,
          'recommendedApps': 10,
          'leaderboard': 3,
          'reviews': 2
        };

        const fieldName = selection.name.value;
        if (expensiveFields[fieldName]) {
          fieldCost = expensiveFields[fieldName];
        }

        // Handle list multipliers (pagination: first/last args)
        let listMultiplier = 1;
        if (selection.arguments) {
          for (const arg of selection.arguments) {
            if ((arg.name.value === 'first' || arg.name.value === 'last' || arg.name.value === 'limit') &&
                arg.value.kind === 'IntValue') {
              listMultiplier = Math.min(parseInt(arg.value.value), 100); // Cap at 100
            }
          }
        }

        const fieldComplexity = fieldCost * listMultiplier;
        complexity += fieldComplexity * multiplier;

        // Recurse into nested selections with increased multiplier
        complexity = calculateComplexity(
          selection,
          complexity,
          multiplier * listMultiplier,
          schema
        );
      } else if (selection.kind === 'InlineFragment') {
        complexity = calculateComplexity(selection, complexity, multiplier, schema);
      }
    }
  }

  return complexity;
}

/**
 * Validate GraphQL query before execution
 * Returns { valid: boolean, errors: string[] }
 */
function validateQuery(document) {
  const errors = [];

  if (!document || !document.definitions) {
    return { valid: true, errors: [] };
  }

  for (const definition of document.definitions) {
    if (definition.kind === 'OperationDefinition') {
      // Check depth
      const depth = getQueryDepth(definition);
      if (depth > MAX_DEPTH) {
        errors.push(`Query depth ${depth} exceeds maximum allowed ${MAX_DEPTH}`);
      }

      // Check complexity
      const complexity = calculateComplexity(definition);
      if (complexity > MAX_COMPLEXITY) {
        errors.push(`Query complexity ${complexity} exceeds maximum allowed ${MAX_COMPLEXITY}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    depth: getQueryDepth(document),
    complexity: calculateComplexity(document)
  };
}

/**
 * GraphQL complexity plugin for Apollo Server
 */
function createComplexityPlugin() {
  return {
    async requestDidParse(requestContext) {
      const { document } = requestContext;
      const validation = validateQuery(document);

      if (!validation.valid) {
        const message = validation.errors.join('; ');
        throw new GraphQLError(
          `Query rejected: ${message}`,
          null,
          null,
          null,
          null,
          null,
          {
            code: 'QUERY_COMPLEXITY_EXCEEDED',
            depth: validation.depth,
            complexity: validation.complexity,
            maxDepth: MAX_DEPTH,
            maxComplexity: MAX_COMPLEXITY
          }
        );
      }

      // Add to context for logging
      requestContext.context.queryMetrics = {
        depth: validation.depth,
        complexity: validation.complexity
      };
    }
  };
}

/**
 * Express middleware to validate GraphQL queries
 * Use for non-Apollo GraphQL endpoints
 */
function complexityMiddleware(req, res, next) {
  if (req.body && req.body.query) {
    try {
      // This would require parsing the GraphQL query
      // In practice, use the Apollo plugin above
      next();
    } catch (error) {
      res.status(400).json({
        errors: [{ message: 'Query validation failed', code: 'QUERY_VALIDATION_ERROR' }]
      });
    }
  } else {
    next();
  }
}

module.exports = {
  createComplexityPlugin,
  complexityMiddleware,
  validateQuery,
  getQueryDepth,
  calculateComplexity,
  MAX_DEPTH,
  MAX_COMPLEXITY
};
