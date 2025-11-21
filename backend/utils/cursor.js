// src/backend/utils/cursor.js
// Cursor encoding/decoding for cursor-based pagination

/**
 * Encodes a cursor from record metadata
 * Format: base64(created_at:id) for stable ordering
 * @param {Object} record - Database record with id and created_at
 * @returns {string} - Base64 encoded cursor
 */
function encodeCursor(record) {
  if (!record || !record.id) {
    throw new Error('Record must have an id field');
  }

  // Use created_at if available, otherwise use id only
  const createdAt = record.created_at || record.createdAt;
  const cursorString = createdAt
    ? `${new Date(createdAt).toISOString()}:${record.id}`
    : `no-timestamp:${record.id}`;

  return Buffer.from(cursorString, 'utf-8').toString('base64');
}

/**
 * Decodes a cursor to its components
 * @param {string} cursor - Base64 encoded cursor
 * @returns {Object} - { createdAt: Date|null, id: string }
 */
function decodeCursor(cursor) {
  if (!cursor || typeof cursor !== 'string') {
    throw new Error('Cursor must be a non-empty string');
  }

  try {
    const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
    const separatorIndex = decoded.lastIndexOf(':');

    if (separatorIndex === -1) {
      throw new Error('Invalid cursor format: missing delimiter');
    }

    const createdAtStr = decoded.slice(0, separatorIndex);
    const id = decoded.slice(separatorIndex + 1);

    if (!id) {
      throw new Error('Invalid cursor format: missing id');
    }

    return {
      createdAt: createdAtStr !== 'no-timestamp' ? new Date(createdAtStr) : null,
      id
    };
  } catch (error) {
    throw new Error(`Invalid cursor format: ${error.message}`);
  }
}

/**
 * Validates cursor format without throwing
 * @param {string} cursor - Cursor to validate
 * @returns {boolean}
 */
function isValidCursor(cursor) {
  try {
    decodeCursor(cursor);
    return true;
  } catch {
    return false;
  }
}

module.exports = {
  encodeCursor,
  decodeCursor,
  isValidCursor
};
