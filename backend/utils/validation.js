// src/backend/utils/validation.js
// Input validation utilities for preventing bad data and security issues

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_REGEX = /^https?:\/\/.+/i;
const USERNAME_REGEX = /^[a-zA-Z0-9_-]{3,30}$/;
const ETH_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

/**
 * Validate email format
 * @param {string} email
 * @returns {object} { valid: boolean, message?: string }
 */
function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return { valid: false, message: 'Email is required and must be a string' };
  }
  
  const trimmed = email.trim();
  if (trimmed.length > 255) {
    return { valid: false, message: 'Email must be less than 255 characters' };
  }
  
  if (!EMAIL_REGEX.test(trimmed)) {
    return { valid: false, message: 'Invalid email format' };
  }
  
  return { valid: true };
}

/**
 * Validate password strength
 * @param {string} password
 * @returns {object} { valid: boolean, message?: string, strength?: string }
 */
function validatePassword(password) {
  if (!password || typeof password !== 'string') {
    return { valid: false, message: 'Password is required and must be a string' };
  }
  
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters' };
  }
  
  if (password.length > 128) {
    return { valid: false, message: 'Password must be less than 128 characters' };
  }
  
  // Check for strength
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};:"\\|,.<>\/?]/.test(password);
  
  let strength = 'weak';
  const checks = [hasUppercase, hasLowercase, hasNumbers, hasSpecial].filter(Boolean).length;
  
  if (checks >= 3) strength = 'strong';
  else if (checks >= 2) strength = 'medium';
  
  return { valid: true, strength };
}

/**
 * Validate username format
 * @param {string} username
 * @returns {object} { valid: boolean, message?: string }
 */
function validateUsername(username) {
  if (!username || typeof username !== 'string') {
    return { valid: false, message: 'Username is required and must be a string' };
  }
  
  if (!USERNAME_REGEX.test(username)) {
    return { 
      valid: false, 
      message: 'Username must be 3-30 characters, alphanumeric, underscore, or hyphen only' 
    };
  }
  
  return { valid: true };
}

/**
 * Validate URL format
 * @param {string} url
 * @returns {object} { valid: boolean, message?: string }
 */
function validateUrl(url) {
  if (!url || typeof url !== 'string') {
    return { valid: false, message: 'URL is required and must be a string' };
  }
  
  if (url.length > 2048) {
    return { valid: false, message: 'URL must be less than 2048 characters' };
  }
  
  if (!URL_REGEX.test(url)) {
    return { valid: false, message: 'URL must start with http:// or https://' };
  }
  
  return { valid: true };
}

/**
 * Validate Ethereum wallet address
 * @param {string} address
 * @returns {object} { valid: boolean, message?: string }
 */
function validateEthAddress(address) {
  if (!address || typeof address !== 'string') {
    return { valid: false, message: 'Ethereum address is required' };
  }
  
  if (!ETH_ADDRESS_REGEX.test(address)) {
    return { valid: false, message: 'Invalid Ethereum address format (must be 0x followed by 40 hex characters)' };
  }
  
  return { valid: true };
}

/**
 * Validate rating value
 * @param {number} rating
 * @param {number} min - Minimum value (default 0)
 * @param {number} max - Maximum value (default 5)
 * @returns {object} { valid: boolean, message?: string }
 */
function validateRating(rating, min = 0, max = 5) {
  if (rating === null || rating === undefined || typeof rating !== 'number') {
    return { valid: false, message: 'Rating must be a number' };
  }
  
  if (rating < min || rating > max) {
    return { valid: false, message: `Rating must be between ${min} and ${max}` };
  }
  
  return { valid: true };
}

/**
 * Validate text length
 * @param {string} text
 * @param {number} minLength
 * @param {number} maxLength
 * @param {string} fieldName - For error message
 * @returns {object} { valid: boolean, message?: string }
 */
function validateTextLength(text, minLength = 1, maxLength = 5000, fieldName = 'Text') {
  if (!text || typeof text !== 'string') {
    return { valid: false, message: `${fieldName} is required and must be a string` };
  }
  
  const trimmed = text.trim();
  
  if (trimmed.length < minLength) {
    return { valid: false, message: `${fieldName} must be at least ${minLength} characters` };
  }
  
  if (trimmed.length > maxLength) {
    return { valid: false, message: `${fieldName} must be less than ${maxLength} characters` };
  }
  
  return { valid: true };
}

/**
 * Validate array of strings
 * @param {array} arr
 * @param {number} maxItems
 * @param {string} fieldName
 * @returns {object} { valid: boolean, message?: string }
 */
function validateStringArray(arr, maxItems = 100, fieldName = 'Array') {
  if (!Array.isArray(arr)) {
    return { valid: false, message: `${fieldName} must be an array` };
  }
  
  if (arr.length > maxItems) {
    return { valid: false, message: `${fieldName} cannot exceed ${maxItems} items` };
  }
  
  if (!arr.every(item => typeof item === 'string')) {
    return { valid: false, message: `${fieldName} must contain only strings` };
  }
  
  return { valid: true };
}

/**
 * Validate confidence score
 * @param {number} score
 * @returns {object} { valid: boolean, message?: string }
 */
function validateConfidenceScore(score) {
  if (score === null || score === undefined || typeof score !== 'number') {
    return { valid: false, message: 'Confidence score must be a number' };
  }
  
  if (score < 0 || score > 1) {
    return { valid: false, message: 'Confidence score must be between 0 and 1' };
  }
  
  return { valid: true };
}

/**
 * Validate fact-check verdict
 * @param {string} verdict
 * @returns {object} { valid: boolean, message?: string }
 */
function validateVerdict(verdict) {
  const validVerdicts = ['true', 'false', 'misleading', 'unverified'];
  
  if (!verdict || typeof verdict !== 'string') {
    return { valid: false, message: 'Verdict is required and must be a string' };
  }
  
  if (!validVerdicts.includes(verdict.toLowerCase())) {
    return { valid: false, message: `Verdict must be one of: ${validVerdicts.join(', ')}` };
  }
  
  return { valid: true };
}

/**
 * Validate vote value (upvote/downvote)
 * @param {number} vote
 * @returns {object} { valid: boolean, message?: string }
 */
function validateVote(vote) {
  if (vote === null || vote === undefined || typeof vote !== 'number') {
    return { valid: false, message: 'Vote must be a number' };
  }

  if (vote !== 1 && vote !== -1) {
    return { valid: false, message: 'Vote must be +1 (upvote) or -1 (downvote)' };
  }

  return { valid: true };
}

/**
 * Batch validate multiple inputs
 * @param {object} input - Object with fields to validate
 * @param {object} rules - Validation rules { fieldName: validatorFunction }
 * @returns {object} { valid: boolean, errors?: object }
 */
function validateInput(input, rules) {
  const errors = {};

  for (const [field, validator] of Object.entries(rules)) {
    const result = validator(input[field]);
    if (!result.valid) {
      errors[field] = result.message;
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors: Object.keys(errors).length > 0 ? errors : undefined
  };
}

module.exports = {
  validateEmail,
  validatePassword,
  validateUsername,
  validateUrl,
  validateEthAddress,
  validateRating,
  validateTextLength,
  validateStringArray,
  validateConfidenceScore,
  validateVerdict,
  validateVote,
  validateInput
};
