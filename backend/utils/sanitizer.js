// src/backend/utils/sanitizer.js
// Centralized helpers to strip dangerous HTML and prevent XSS in user-supplied content

const sanitizeHtml = require('sanitize-html');

const PLAIN_TEXT_OPTIONS = {
  allowedTags: [],
  allowedAttributes: {},
  disallowedTagsMode: 'discard'
};

const RICH_TEXT_OPTIONS = {
  allowedTags: ['b', 'i', 'em', 'strong', 'a', 'ul', 'ol', 'li', 'p', 'br', 'blockquote', 'code'],
  allowedAttributes: {
    a: ['href', 'name', 'target', 'rel']
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  disallowedTagsMode: 'discard'
};

function sanitizeString(value, options = PLAIN_TEXT_OPTIONS) {
  if (value === undefined || value === null) return value;
  if (typeof value !== 'string') return value;

  // First pass: Strip dangerous tags (script, style, iframe) completely
  let processed = value;
  processed = processed.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  processed = processed.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '');
  processed = processed.replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, '');

  // Second pass: Sanitize HTML tags according to policy
  const sanitized = sanitizeHtml(processed, options);
  return sanitized.trim();
}

function sanitizePlainText(value) {
  return sanitizeString(value, PLAIN_TEXT_OPTIONS);
}

function sanitizeRichText(value) {
  return sanitizeString(value, RICH_TEXT_OPTIONS);
}

function sanitizeStringArray(values = [], sanitizer = sanitizePlainText) {
  if (!Array.isArray(values)) return [];
  return values
    .map((value) => sanitizer(value))
    .filter((value) => Boolean(value));
}

function sanitizeJson(value, sanitizer = sanitizePlainText) {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'string') {
    return sanitizer(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeJson(item, sanitizer));
  }

  if (typeof value === 'object') {
    return Object.keys(value).reduce((acc, key) => {
      acc[key] = sanitizeJson(value[key], sanitizer);
      return acc;
    }, {});
  }

  return value;
}

module.exports = {
  sanitizePlainText,
  sanitizeRichText,
  sanitizeStringArray,
  sanitizeJson
};
