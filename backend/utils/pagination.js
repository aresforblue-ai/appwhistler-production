// src/backend/utils/pagination.js
// Cursor-based pagination utilities for GraphQL resolvers

const { decodeCursor } = require('./cursor');
const logger = require('./logger');

/**
 * Builds WHERE clause for cursor-based pagination
 * Supports forward and backward pagination using (created_at, id) tuple comparison
 *
 * @param {string} afterCursor - Cursor for forward pagination
 * @param {string} beforeCursor - Cursor for backward pagination
 * @param {string} orderField - Field to order by (default: 'created_at')
 * @param {string} idField - ID field name (default: 'id')
 * @param {number} paramCount - Current parameter count for $1, $2, etc.
 * @returns {Object} - { whereClause, params, newParamCount }
 */
function buildCursorWhereClause(
  afterCursor,
  beforeCursor,
  orderField = 'created_at',
  idField = 'id',
  paramCount = 1
) {
  const conditions = [];
  const params = [];
  let currentParamCount = paramCount;

  if (afterCursor) {
    const { createdAt, id } = decodeCursor(afterCursor);

    // For forward pagination: (created_at, id) > (cursor_created_at, cursor_id)
    // This ensures we get records after this cursor in sort order
    if (createdAt) {
      conditions.push(`
        (${orderField} < $${currentParamCount} OR
         (${orderField} = $${currentParamCount + 1} AND ${idField} > $${currentParamCount + 2}))
      `.trim());
      params.push(createdAt, createdAt, id);
      currentParamCount += 3;
    } else {
      // Fallback for records without timestamp
      conditions.push(`${idField} > $${currentParamCount}`);
      params.push(id);
      currentParamCount += 1;
    }
  }

  if (beforeCursor) {
    const { createdAt, id } = decodeCursor(beforeCursor);

    // For backward pagination: (created_at, id) < (cursor_created_at, cursor_id)
    if (createdAt) {
      conditions.push(`
        (${orderField} > $${currentParamCount} OR
         (${orderField} = $${currentParamCount + 1} AND ${idField} < $${currentParamCount + 2}))
      `.trim());
      params.push(createdAt, createdAt, id);
      currentParamCount += 3;
    } else {
      conditions.push(`${idField} < $${currentParamCount}`);
      params.push(id);
      currentParamCount += 1;
    }
  }

  return {
    whereClause: conditions.length > 0 ? conditions.join(' AND ') : '',
    params,
    newParamCount: currentParamCount
  };
}

/**
 * Executes cursor-based pagination query
 * Handles forward/backward pagination, cursor encoding, and hasNextPage/hasPreviousPage
 *
 * @param {Object} options - Query options
 * @param {Object} options.pool - PostgreSQL pool
 * @param {string} options.baseQuery - Base SELECT query without ORDER/LIMIT
 * @param {Array} options.baseParams - Parameters for base query
 * @param {string} options.afterCursor - Cursor for forward pagination
 * @param {string} options.beforeCursor - Cursor for backward pagination
 * @param {number} options.first - Number of records for forward pagination
 * @param {number} options.last - Number of records for backward pagination
 * @param {string} options.orderField - Field to order by (default: 'created_at')
 * @param {string} options.orderDirection - ASC or DESC (default: 'DESC')
 * @param {string} options.idField - ID field name (default: 'id')
 * @returns {Promise<Object>} - { rows, hasNextPage, hasPreviousPage, startCursor, endCursor }
 */
async function executePaginationQuery({
  pool,
  baseQuery,
  baseParams = [],
  afterCursor = null,
  beforeCursor = null,
  first = null,
  last = null,
  orderField = 'created_at',
  orderDirection = 'DESC',
  idField = 'id'
}) {
  // Validate inputs
  if (first && first < 1) {
    throw new Error('`first` must be >= 1');
  }
  if (last && last < 1) {
    throw new Error('`last` must be >= 1');
  }
  if (first && last) {
    throw new Error('Cannot use both `first` and `last` parameters');
  }

  const limit = (first || last || 20) + 1; // Fetch one extra to detect hasNextPage/hasPreviousPage
  const isBackward = !!last;

  // Build cursor WHERE clause
  let paramCount = baseParams.length + 1;
  const cursorWhere = buildCursorWhereClause(
    afterCursor,
    beforeCursor,
    orderField,
    idField,
    paramCount
  );

  // Build final query
  let query = baseQuery;
  let params = [...baseParams];

  // Add cursor conditions
  if (cursorWhere.whereClause) {
    query += ` AND (${cursorWhere.whereClause})`;
    params.push(...cursorWhere.params);
    paramCount = cursorWhere.newParamCount;
  }

  // Order - for backward pagination, we reverse the order then reverse results
  const orderDir = isBackward
    ? (orderDirection === 'DESC' ? 'ASC' : 'DESC')
    : orderDirection;

  query += ` ORDER BY ${orderField} ${orderDir}, ${idField} ${orderDir}`;

  // Limit
  query += ` LIMIT $${paramCount}`;
  params.push(limit);

  // Execute query
  let result;
  try {
    result = await pool.query(query, params);
  } catch (error) {
    logger.error('[paginateQuery] Database query failed:', error);
    throw new Error('Database query failed: ' + error.message);
  }
  const rows = result.rows;

  // Determine pagination info
  const requestedLimit = first || last || 20;
  const hasMore = rows.length > requestedLimit;
  const actualRows = hasMore ? rows.slice(0, requestedLimit) : rows;

  // For backward pagination, reverse results to correct order
  const finalRows = isBackward ? actualRows.reverse() : actualRows;

  return {
    rows: finalRows,
    hasNextPage: isBackward ? (afterCursor ? true : false) : hasMore,
    hasPreviousPage: isBackward ? hasMore : (beforeCursor ? true : afterCursor ? true : false),
    startCursor: finalRows.length > 0 ? finalRows[0] : null,
    endCursor: finalRows.length > 0 ? finalRows[finalRows.length - 1] : null
  };
}

module.exports = {
  buildCursorWhereClause,
  executePaginationQuery
};
