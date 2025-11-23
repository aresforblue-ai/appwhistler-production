/**
 * Authentication Resolver Tests
 * Test suite for user registration, login, and token management
 */

const authResolvers = require('../auth');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Mock dependencies
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

describe('Auth Resolvers', () => {
  let mockPool;
  let mockContext;

  beforeEach(() => {
    mockPool = {
      query: jest.fn()
    };

    mockContext = {
      pool: mockPool,
      req: { headers: {} },
      user: null
    };

    jest.clearAllMocks();
  });

  describe('Mutation.register', () => {
    const validInput = {
      email: 'test@example.com',
      password: 'SecurePass123!',
      name: 'Test User'
    };

    it('should register a new user successfully', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [] }) // Email check - not exists
        .mockResolvedValueOnce({ rows: [{ id: 1, email: validInput.email, name: validInput.name, role: 'user' }] }); // Insert user

      bcrypt.hash.mockResolvedValue('hashedpassword');
      jwt.sign.mockReturnValue('mock-jwt-token');

      const result = await authResolvers.Mutation.register(null, { input: validInput }, mockContext);

      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('user');
      expect(result.user.email).toBe(validInput.email);
      expect(mockPool.query).toHaveBeenCalledTimes(2);
      expect(bcrypt.hash).toHaveBeenCalledWith(validInput.password, 10);
    });

    it('should reject registration with existing email', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] }); // Email exists

      await expect(
        authResolvers.Mutation.register(null, { input: validInput }, mockContext)
      ).rejects.toThrow(/already registered|exists/i);
    });

    it('should validate email format', async () => {
      const invalidInput = { ...validInput, email: 'not-an-email' };

      await expect(
        authResolvers.Mutation.register(null, { input: invalidInput }, mockContext)
      ).rejects.toThrow(/email/i);
    });

    it('should enforce password strength requirements', async () => {
      const weakInput = { ...validInput, password: '123' };

      await expect(
        authResolvers.Mutation.register(null, { input: weakInput }, mockContext)
      ).rejects.toThrow(/password/i);
    });

    it('should sanitize user input', async () => {
      const maliciousInput = {
        email: 'test@example.com',
        password: 'SecurePass123!',
        name: '<script>alert("xss")</script>'
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: 1, email: maliciousInput.email, name: 'scriptalertxssscript', role: 'user' }] });

      bcrypt.hash.mockResolvedValue('hashedpassword');
      jwt.sign.mockReturnValue('mock-jwt-token');

      const result = await authResolvers.Mutation.register(null, { input: maliciousInput }, mockContext);

      // Name should be sanitized
      expect(result.user.name).not.toContain('<script>');
    });
  });

  describe('Mutation.login', () => {
    const validCredentials = {
      email: 'test@example.com',
      password: 'correctpassword'
    };

    const mockUser = {
      id: 1,
      email: 'test@example.com',
      password_hash: 'hashedpassword',
      name: 'Test User',
      role: 'user',
      email_verified: true
    };

    it('should login user with correct credentials', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [mockUser] });
      bcrypt.compare.mockResolvedValue(true);
      jwt.sign.mockReturnValue('mock-jwt-token');

      const result = await authResolvers.Mutation.login(null, validCredentials, mockContext);

      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('user');
      expect(result.user.email).toBe(validCredentials.email);
      expect(bcrypt.compare).toHaveBeenCalledWith(validCredentials.password, mockUser.password_hash);
    });

    it('should reject login with incorrect password', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [mockUser] });
      bcrypt.compare.mockResolvedValue(false);

      await expect(
        authResolvers.Mutation.login(null, { ...validCredentials, password: 'wrongpassword' }, mockContext)
      ).rejects.toThrow(/invalid|credentials/i);
    });

    it('should reject login for non-existent user', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await expect(
        authResolvers.Mutation.login(null, validCredentials, mockContext)
      ).rejects.toThrow(/invalid|credentials|not found/i);
    });

    it('should not reveal whether email exists', async () => {
      // Security: same error message for wrong email and wrong password
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const error1 = await authResolvers.Mutation.login(null, { email: 'nonexistent@example.com', password: 'test' }, mockContext).catch(e => e);

      mockPool.query.mockResolvedValueOnce({ rows: [mockUser] });
      bcrypt.compare.mockResolvedValue(false);

      const error2 = await authResolvers.Mutation.login(null, { email: mockUser.email, password: 'wrongpass' }, mockContext).catch(e => e);

      expect(error1.message).toBe(error2.message);
    });

    it('should handle rate limiting for failed attempts', async () => {
      // This would typically be tested with the rate limiter middleware
      // Here we just ensure the resolver doesn't crash on rapid calls
      mockPool.query.mockResolvedValue({ rows: [] });

      const promises = Array(10).fill(null).map(() =>
        authResolvers.Mutation.login(null, { email: 'test@example.com', password: 'wrong' }, mockContext).catch(e => e)
      );

      const results = await Promise.all(promises);
      expect(results.every(r => r instanceof Error)).toBe(true);
    });
  });

  describe('Mutation.refreshToken', () => {
    it('should issue new access token with valid refresh token', async () => {
      const mockUser = { id: 1, email: 'test@example.com', role: 'user' };

      jwt.verify.mockReturnValue({ userId: 1 });
      mockPool.query.mockResolvedValueOnce({ rows: [mockUser] });
      jwt.sign.mockReturnValue('new-access-token');

      const result = await authResolvers.Mutation.refreshToken(
        null,
        { refreshToken: 'valid-refresh-token' },
        mockContext
      );

      expect(result).toHaveProperty('accessToken');
      expect(result.accessToken).toBe('new-access-token');
    });

    it('should reject invalid refresh token', async () => {
      jwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(
        authResolvers.Mutation.refreshToken(null, { refreshToken: 'invalid' }, mockContext)
      ).rejects.toThrow(/invalid|token/i);
    });

    it('should reject expired refresh token', async () => {
      jwt.verify.mockImplementation(() => {
        const error = new Error('jwt expired');
        error.name = 'TokenExpiredError';
        throw error;
      });

      await expect(
        authResolvers.Mutation.refreshToken(null, { refreshToken: 'expired' }, mockContext)
      ).rejects.toThrow(/expired/i);
    });
  });

  describe('Mutation.changePassword', () => {
    it('should change password for authenticated user', async () => {
      const mockUser = { id: 1, password_hash: 'oldhashedpassword' };
      mockContext.user = { id: 1 };

      mockPool.query
        .mockResolvedValueOnce({ rows: [mockUser] }) // Get user
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }); // Update password

      bcrypt.compare.mockResolvedValue(true); // Old password correct
      bcrypt.hash.mockResolvedValue('newhashedpassword');

      const result = await authResolvers.Mutation.changePassword(
        null,
        { currentPassword: 'oldpass', newPassword: 'NewSecurePass123!' },
        mockContext
      );

      expect(result).toBe(true);
      expect(bcrypt.hash).toHaveBeenCalledWith('NewSecurePass123!', 10);
    });

    it('should reject password change with wrong current password', async () => {
      const mockUser = { id: 1, password_hash: 'hashedpassword' };
      mockContext.user = { id: 1 };

      mockPool.query.mockResolvedValueOnce({ rows: [mockUser] });
      bcrypt.compare.mockResolvedValue(false);

      await expect(
        authResolvers.Mutation.changePassword(
          null,
          { currentPassword: 'wrongpass', newPassword: 'NewPass123!' },
          mockContext
        )
      ).rejects.toThrow(/current password/i);
    });

    it('should reject password change for unauthenticated user', async () => {
      mockContext.user = null;

      await expect(
        authResolvers.Mutation.changePassword(
          null,
          { currentPassword: 'old', newPassword: 'new' },
          mockContext
        )
      ).rejects.toThrow(/unauthorized|not authenticated/i);
    });

    it('should enforce password strength on new password', async () => {
      mockContext.user = { id: 1 };
      const mockUser = { id: 1, password_hash: 'hashedpassword' };

      mockPool.query.mockResolvedValueOnce({ rows: [mockUser] });
      bcrypt.compare.mockResolvedValue(true);

      await expect(
        authResolvers.Mutation.changePassword(
          null,
          { currentPassword: 'oldpass', newPassword: '123' }, // Weak password
          mockContext
        )
      ).rejects.toThrow(/password.*strong|password.*requirements/i);
    });
  });

  describe('Query.me', () => {
    it('should return current user data', async () => {
      mockContext.user = { id: 1 };
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        role: 'user',
        created_at: new Date()
      };

      mockPool.query.mockResolvedValueOnce({ rows: [mockUser] });

      const result = await authResolvers.Query.me(null, {}, mockContext);

      expect(result).toEqual(mockUser);
    });

    it('should return null for unauthenticated request', async () => {
      mockContext.user = null;

      const result = await authResolvers.Query.me(null, {}, mockContext);

      expect(result).toBeNull();
    });

    it('should not include sensitive fields', async () => {
      mockContext.user = { id: 1 };
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        password_hash: 'shouldnotbeincluded', // Sensitive
        name: 'Test User',
        role: 'user'
      };

      mockPool.query.mockResolvedValueOnce({ rows: [mockUser] });

      const result = await authResolvers.Query.me(null, {}, mockContext);

      expect(result).not.toHaveProperty('password_hash');
    });
  });
});
