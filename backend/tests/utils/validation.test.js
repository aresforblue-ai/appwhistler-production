// tests/utils/validation.test.js
// Comprehensive test suite for validation utilities

const {
  validateEmail,
  validatePassword,
  validateUsername,
  validateUrl,
  validateRating,
} = require('../../utils/validation');

// ============================================================================
// validateEmail() - 15 test cases
// ============================================================================
describe('validateEmail', () => {
  // Valid cases
  it('should accept valid email', () => {
    const result = validateEmail('test@example.com');
    expect(result.valid).toBe(true);
    expect(result.message).toBeUndefined();
  });

  it('should accept email with subdomain', () => {
    const result = validateEmail('user@mail.company.com');
    expect(result.valid).toBe(true);
  });

  it('should accept email with plus sign', () => {
    const result = validateEmail('user+tag@example.com');
    expect(result.valid).toBe(true);
  });

  it('should accept email with numbers', () => {
    const result = validateEmail('user123@example456.com');
    expect(result.valid).toBe(true);
  });

  it('should accept email with hyphens', () => {
    const result = validateEmail('first-last@my-domain.com');
    expect(result.valid).toBe(true);
  });

  // Invalid cases
  it('should reject email without @', () => {
    const result = validateEmail('invalid.email');
    expect(result.valid).toBe(false);
    expect(result.message).toBe('Invalid email format');
  });

  it('should reject email without domain', () => {
    const result = validateEmail('user@');
    expect(result.valid).toBe(false);
    expect(result.message).toBe('Invalid email format');
  });

  it('should reject email without local part', () => {
    const result = validateEmail('@example.com');
    expect(result.valid).toBe(false);
    expect(result.message).toBe('Invalid email format');
  });

  it('should reject email with spaces', () => {
    const result = validateEmail('user name@example.com');
    expect(result.valid).toBe(false);
    expect(result.message).toBe('Invalid email format');
  });

  it('should reject empty string', () => {
    const result = validateEmail('');
    expect(result.valid).toBe(false);
    expect(result.message).toBe('Email is required and must be a string');
  });

  it('should reject null', () => {
    const result = validateEmail(null);
    expect(result.valid).toBe(false);
    expect(result.message).toBe('Email is required and must be a string');
  });

  it('should reject undefined', () => {
    const result = validateEmail(undefined);
    expect(result.valid).toBe(false);
    expect(result.message).toBe('Email is required and must be a string');
  });

  it('should reject non-string type', () => {
    const result = validateEmail(12345);
    expect(result.valid).toBe(false);
    expect(result.message).toBe('Email is required and must be a string');
  });

  it('should reject email exceeding 255 characters', () => {
    const longEmail = 'a'.repeat(250) + '@example.com';
    const result = validateEmail(longEmail);
    expect(result.valid).toBe(false);
    expect(result.message).toBe('Email must be less than 255 characters');
  });

  it('should trim whitespace and validate', () => {
    const result = validateEmail('  test@example.com  ');
    expect(result.valid).toBe(true);
  });
});

// ============================================================================
// validatePassword() - 15 test cases
// ============================================================================
describe('validatePassword', () => {
  // Valid cases with different strengths
  it('should accept strong password with all character types', () => {
    const result = validatePassword('StrongP@ss123');
    expect(result.valid).toBe(true);
    expect(result.strength).toBe('strong');
  });

  it('should accept password with uppercase, lowercase, and numbers', () => {
    const result = validatePassword('Password123');
    expect(result.valid).toBe(true);
    expect(result.strength).toBe('strong');
  });

  it('should accept password with uppercase, lowercase, and special chars', () => {
    const result = validatePassword('P@ssword!');
    expect(result.valid).toBe(true);
    expect(result.strength).toBe('strong');
  });

  it('should classify medium strength password', () => {
    const result = validatePassword('password123');
    expect(result.valid).toBe(true);
    expect(result.strength).toBe('medium');
  });

  it('should classify weak password (lowercase only)', () => {
    const result = validatePassword('password');
    expect(result.valid).toBe(true);
    expect(result.strength).toBe('weak');
  });

  it('should accept password at minimum length (8 chars)', () => {
    const result = validatePassword('Pass123!');
    expect(result.valid).toBe(true);
    expect(result.strength).toBe('strong');
  });

  it('should accept long password (127 chars)', () => {
    const longPassword = 'A'.repeat(60) + 'b'.repeat(60) + '1234567';
    const result = validatePassword(longPassword);
    expect(result.valid).toBe(true);
  });

  // Invalid cases
  it('should reject password shorter than 8 characters', () => {
    const result = validatePassword('Pass1!');
    expect(result.valid).toBe(false);
    expect(result.message).toBe('Password must be at least 8 characters');
  });

  it('should reject password longer than 128 characters', () => {
    const longPassword = 'A'.repeat(129);
    const result = validatePassword(longPassword);
    expect(result.valid).toBe(false);
    expect(result.message).toBe('Password must be less than 128 characters');
  });

  it('should reject empty string', () => {
    const result = validatePassword('');
    expect(result.valid).toBe(false);
    expect(result.message).toBe('Password is required and must be a string');
  });

  it('should reject null', () => {
    const result = validatePassword(null);
    expect(result.valid).toBe(false);
    expect(result.message).toBe('Password is required and must be a string');
  });

  it('should reject undefined', () => {
    const result = validatePassword(undefined);
    expect(result.valid).toBe(false);
    expect(result.message).toBe('Password is required and must be a string');
  });

  it('should reject non-string type', () => {
    const result = validatePassword(12345678);
    expect(result.valid).toBe(false);
    expect(result.message).toBe('Password is required and must be a string');
  });

  it('should accept password with various special characters', () => {
    const result = validatePassword('P@ss!w0rd#$%^&*()');
    expect(result.valid).toBe(true);
    expect(result.strength).toBe('strong');
  });

  it('should classify uppercase + numbers as medium', () => {
    const result = validatePassword('PASSWORD123');
    expect(result.valid).toBe(true);
    expect(result.strength).toBe('medium');
  });
});

// ============================================================================
// validateUrl() - 10 test cases
// ============================================================================
describe('validateUrl', () => {
  // Valid cases
  it('should accept valid HTTPS URL', () => {
    const result = validateUrl('https://example.com');
    expect(result.valid).toBe(true);
  });

  it('should accept valid HTTP URL', () => {
    const result = validateUrl('http://example.com');
    expect(result.valid).toBe(true);
  });

  it('should accept URL with path', () => {
    const result = validateUrl('https://example.com/path/to/page');
    expect(result.valid).toBe(true);
  });

  it('should accept URL with query parameters', () => {
    const result = validateUrl('https://example.com/search?q=test&page=1');
    expect(result.valid).toBe(true);
  });

  it('should accept URL with subdomain and port', () => {
    const result = validateUrl('https://api.example.com:8080/endpoint');
    expect(result.valid).toBe(true);
  });

  // Invalid cases
  it('should reject URL without protocol', () => {
    const result = validateUrl('example.com');
    expect(result.valid).toBe(false);
    expect(result.message).toBe('URL must start with http:// or https://');
  });

  it('should reject URL with invalid protocol', () => {
    const result = validateUrl('ftp://example.com');
    expect(result.valid).toBe(false);
    expect(result.message).toBe('URL must start with http:// or https://');
  });

  it('should reject URL exceeding 2048 characters', () => {
    const longUrl = 'https://example.com/' + 'a'.repeat(2050);
    const result = validateUrl(longUrl);
    expect(result.valid).toBe(false);
    expect(result.message).toBe('URL must be less than 2048 characters');
  });

  it('should reject empty string', () => {
    const result = validateUrl('');
    expect(result.valid).toBe(false);
    expect(result.message).toBe('URL is required and must be a string');
  });

  it('should reject null', () => {
    const result = validateUrl(null);
    expect(result.valid).toBe(false);
    expect(result.message).toBe('URL is required and must be a string');
  });
});

// ============================================================================
// validateUsername() - 10 test cases
// ============================================================================
describe('validateUsername', () => {
  // Valid cases
  it('should accept valid alphanumeric username', () => {
    const result = validateUsername('john_doe');
    expect(result.valid).toBe(true);
  });

  it('should accept username with underscore', () => {
    const result = validateUsername('user_name_123');
    expect(result.valid).toBe(true);
  });

  it('should accept username with hyphen', () => {
    const result = validateUsername('user-name');
    expect(result.valid).toBe(true);
  });

  it('should accept username at minimum length (3 chars)', () => {
    const result = validateUsername('abc');
    expect(result.valid).toBe(true);
  });

  it('should accept username at maximum length (30 chars)', () => {
    const result = validateUsername('a'.repeat(30));
    expect(result.valid).toBe(true);
  });

  // Invalid cases
  it('should reject username shorter than 3 characters', () => {
    const result = validateUsername('ab');
    expect(result.valid).toBe(false);
    expect(result.message).toBe('Username must be 3-30 characters, alphanumeric, underscore, or hyphen only');
  });

  it('should reject username longer than 30 characters', () => {
    const result = validateUsername('a'.repeat(31));
    expect(result.valid).toBe(false);
    expect(result.message).toBe('Username must be 3-30 characters, alphanumeric, underscore, or hyphen only');
  });

  it('should reject username with special characters', () => {
    const result = validateUsername('user@name');
    expect(result.valid).toBe(false);
    expect(result.message).toBe('Username must be 3-30 characters, alphanumeric, underscore, or hyphen only');
  });

  it('should reject username with spaces', () => {
    const result = validateUsername('user name');
    expect(result.valid).toBe(false);
    expect(result.message).toBe('Username must be 3-30 characters, alphanumeric, underscore, or hyphen only');
  });

  it('should reject empty string', () => {
    const result = validateUsername('');
    expect(result.valid).toBe(false);
    expect(result.message).toBe('Username is required and must be a string');
  });
});

// ============================================================================
// validateRating() - 8 test cases
// ============================================================================
describe('validateRating', () => {
  // Valid cases
  it('should accept rating at minimum (0)', () => {
    const result = validateRating(0);
    expect(result.valid).toBe(true);
  });

  it('should accept rating at maximum (5)', () => {
    const result = validateRating(5);
    expect(result.valid).toBe(true);
  });

  it('should accept rating in middle range (3)', () => {
    const result = validateRating(3);
    expect(result.valid).toBe(true);
  });

  it('should accept decimal rating', () => {
    const result = validateRating(4.5);
    expect(result.valid).toBe(true);
  });

  it('should accept custom range (1-10)', () => {
    const result = validateRating(7, 1, 10);
    expect(result.valid).toBe(true);
  });

  // Invalid cases
  it('should reject rating below minimum', () => {
    const result = validateRating(-1);
    expect(result.valid).toBe(false);
    expect(result.message).toBe('Rating must be between 0 and 5');
  });

  it('should reject rating above maximum', () => {
    const result = validateRating(6);
    expect(result.valid).toBe(false);
    expect(result.message).toBe('Rating must be between 0 and 5');
  });

  it('should reject non-number type', () => {
    const result = validateRating('5');
    expect(result.valid).toBe(false);
    expect(result.message).toBe('Rating must be a number');
  });
});
