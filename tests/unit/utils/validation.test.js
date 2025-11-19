const {
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
} = require('../../../src/backend/utils/validation');

describe('validation utils', () => {
  test('validateEmail accepts proper email and rejects invalid', () => {
    expect(validateEmail('user@example.com').valid).toBe(true);
    const missingAt = validateEmail('userexample.com');
    expect(missingAt.valid).toBe(false);
    expect(missingAt.message).toMatch(/Invalid email/);
  });

  test('validatePassword enforces length and strength', () => {
    expect(validatePassword('Password1!')).toMatchObject({ valid: true, strength: 'strong' });
    expect(validatePassword('short').valid).toBe(false);
    expect(validatePassword('abcdefgh').strength).toBe('weak');
  });

  test('validateUsername ensures allowed charset', () => {
    expect(validateUsername('appwhistler_user').valid).toBe(true);
    const result = validateUsername('bad user');
    expect(result.valid).toBe(false);
    expect(result.message).toContain('Username must be 3-30 characters');
  });

  test('validateUrl checks http/https scheme', () => {
    expect(validateUrl('https://example.com').valid).toBe(true);
    const res = validateUrl('ftp://example.com');
    expect(res.valid).toBe(false);
    expect(res.message).toContain('http:// or https://');
  });

  test('validateEthAddress matches hex pattern', () => {
    expect(validateEthAddress('0x1234567890abcdef1234567890abcdef12345678').valid).toBe(true);
    expect(validateEthAddress('0xBAD').valid).toBe(false);
  });

  test('validateRating respects range', () => {
    expect(validateRating(4.2).valid).toBe(true);
    expect(validateRating(6).valid).toBe(false);
  });

  test('validateTextLength trims and bounds text', () => {
    expect(validateTextLength(' hello ', 1, 10).valid).toBe(true);
    expect(validateTextLength('  ', 1, 10).valid).toBe(false);
  });

  test('validateStringArray ensures array of strings limited in size', () => {
    expect(validateStringArray(['a', 'b']).valid).toBe(true);
    expect(validateStringArray(['a', 1]).valid).toBe(false);
  });

  test('validateConfidenceScore expects number in [0,1]', () => {
    expect(validateConfidenceScore(0.4).valid).toBe(true);
    expect(validateConfidenceScore(1.5).valid).toBe(false);
  });

  test('validateVerdict matches allowed values ignoring case', () => {
    expect(validateVerdict('TRUE').valid).toBe(true);
    expect(validateVerdict('maybe').valid).toBe(false);
  });

  test('validateVote only allows +/- 1', () => {
    expect(validateVote(1).valid).toBe(true);
    expect(validateVote(0).valid).toBe(false);
  });

  test('validateInput aggregates field errors', () => {
    const result = validateInput(
      { email: 'bad', username: 'ok' },
      { email: validateEmail, username: validateUsername }
    );
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveProperty('email');
  });
});
