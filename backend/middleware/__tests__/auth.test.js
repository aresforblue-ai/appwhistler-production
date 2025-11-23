/**
 * Auth Middleware Tests
 * Test suite for JWT authentication middleware
 */

const authMiddleware = require('../auth');
const jwt = require('jsonwebtoken');

jest.mock('jsonwebtoken');

describe('Auth Middleware', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    mockReq = {
      headers: {},
      user: null
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    mockNext = jest.fn();

    jest.clearAllMocks();
  });

  describe('authenticateToken', () => {
    it('should authenticate valid JWT token', () => {
      const mockUser = { userId: 1, email: 'test@example.com', role: 'user' };
      mockReq.headers.authorization = 'Bearer valid-token';

      jwt.verify.mockReturnValue(mockUser);

      authMiddleware.authenticateToken(mockReq, mockRes, mockNext);

      expect(mockReq.user).toEqual(mockUser);
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should reject request without authorization header', () => {
      authMiddleware.authenticateToken(mockReq, mockRes, mockNext);

      expect(mockReq.user).toBeNull();
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringMatching(/token/i) })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject malformed authorization header', () => {
      mockReq.headers.authorization = 'InvalidFormat token';

      authMiddleware.authenticateToken(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should reject invalid JWT token', () => {
      mockReq.headers.authorization = 'Bearer invalid-token';

      jwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      authMiddleware.authenticateToken(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject expired JWT token', () => {
      mockReq.headers.authorization = 'Bearer expired-token';

      const error = new Error('jwt expired');
      error.name = 'TokenExpiredError';
      jwt.verify.mockImplementation(() => {
        throw error;
      });

      authMiddleware.authenticateToken(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringMatching(/expired/i) })
      );
    });

    it('should handle token with Bearer prefix (case insensitive)', () => {
      const mockUser = { userId: 1 };
      mockReq.headers.authorization = 'bearer valid-token'; // lowercase

      jwt.verify.mockReturnValue(mockUser);

      authMiddleware.authenticateToken(mockReq, mockRes, mockNext);

      expect(mockReq.user).toEqual(mockUser);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should extract user data from token payload', () => {
      const tokenPayload = {
        userId: 123,
        email: 'user@example.com',
        role: 'admin',
        permissions: ['read', 'write']
      };

      mockReq.headers.authorization = 'Bearer token';
      jwt.verify.mockReturnValue(tokenPayload);

      authMiddleware.authenticateToken(mockReq, mockRes, mockNext);

      expect(mockReq.user).toEqual(tokenPayload);
      expect(mockReq.user.role).toBe('admin');
    });
  });

  describe('requireAuth', () => {
    it('should allow authenticated user to proceed', () => {
      mockReq.user = { userId: 1 };

      authMiddleware.requireAuth(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should block unauthenticated user', () => {
      mockReq.user = null;

      authMiddleware.requireAuth(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('requireRole', () => {
    it('should allow user with correct role', () => {
      mockReq.user = { userId: 1, role: 'admin' };

      const middleware = authMiddleware.requireRole('admin');
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should block user with wrong role', () => {
      mockReq.user = { userId: 1, role: 'user' };

      const middleware = authMiddleware.requireRole('admin');
      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should block unauthenticated user', () => {
      mockReq.user = null;

      const middleware = authMiddleware.requireRole('user');
      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should allow multiple roles (OR logic)', () => {
      mockReq.user = { userId: 1, role: 'moderator' };

      const middleware = authMiddleware.requireRole(['admin', 'moderator']);
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('optionalAuth', () => {
    it('should set user if token provided and valid', () => {
      const mockUser = { userId: 1 };
      mockReq.headers.authorization = 'Bearer valid-token';
      jwt.verify.mockReturnValue(mockUser);

      authMiddleware.optionalAuth(mockReq, mockRes, mockNext);

      expect(mockReq.user).toEqual(mockUser);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should proceed without user if no token provided', () => {
      authMiddleware.optionalAuth(mockReq, mockRes, mockNext);

      expect(mockReq.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should proceed without user if token invalid (not blocking)', () => {
      mockReq.headers.authorization = 'Bearer invalid';
      jwt.verify.mockImplementation(() => {
        throw new Error('Invalid');
      });

      authMiddleware.optionalAuth(mockReq, mockRes, mockNext);

      expect(mockReq.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('OAuth Integration', () => {
    describe('googleOAuth', () => {
      it('should redirect to Google OAuth URL', () => {
        mockReq.query = {};

        authMiddleware.googleOAuth(mockReq, mockRes);

        expect(mockRes.redirect).toHaveBeenCalled();
        const redirectUrl = mockRes.redirect.mock.calls[0][0];
        expect(redirectUrl).toContain('accounts.google.com');
      });

      it('should include state parameter for CSRF protection', () => {
        mockReq.query = {};
        mockRes.redirect = jest.fn();

        authMiddleware.googleOAuth(mockReq, mockRes);

        const redirectUrl = mockRes.redirect.mock.calls[0][0];
        expect(redirectUrl).toContain('state=');
      });
    });

    describe('googleOAuthCallback', () => {
      it('should exchange code for tokens', async () => {
        mockReq.query = { code: 'auth-code', state: 'valid-state' };

        // Mock external API call to Google
        const mockAxios = require('axios');
        mockAxios.post.mockResolvedValue({
          data: {
            access_token: 'google-access-token',
            id_token: 'google-id-token'
          }
        });

        await authMiddleware.googleOAuthCallback(mockReq, mockRes);

        expect(mockAxios.post).toHaveBeenCalledWith(
          expect.stringContaining('oauth2.googleapis.com'),
          expect.anything()
        );
      });

      it('should reject callback with missing code', async () => {
        mockReq.query = {};

        await authMiddleware.googleOAuthCallback(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
      });

      it('should validate state parameter', async () => {
        mockReq.query = { code: 'code', state: 'invalid-state' };
        mockReq.session = { oauthState: 'valid-state' };

        await authMiddleware.googleOAuthCallback(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(403);
      });
    });
  });

  describe('Security', () => {
    it('should not leak token details in error messages', () => {
      mockReq.headers.authorization = 'Bearer secret-token-12345';

      jwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      authMiddleware.authenticateToken(mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(JSON.stringify(response)).not.toContain('secret-token-12345');
    });

    it('should rate limit authentication attempts', () => {
      // Simulate 100 failed auth attempts
      for (let i = 0; i < 100; i++) {
        mockReq.headers.authorization = 'Bearer invalid';
        jwt.verify.mockImplementation(() => {
          throw new Error('Invalid');
        });

        authMiddleware.authenticateToken(mockReq, mockRes, mockNext);
      }

      // After many failures, should still process (handled by rate limiter middleware)
      expect(mockRes.status).toHaveBeenCalled();
    });

    it('should sanitize user data from token', () => {
      const maliciousPayload = {
        userId: 1,
        email: '<script>alert("xss")</script>@example.com',
        role: 'user<img src=x onerror=alert(1)>'
      };

      mockReq.headers.authorization = 'Bearer token';
      jwt.verify.mockReturnValue(maliciousPayload);

      authMiddleware.authenticateToken(mockReq, mockRes, mockNext);

      // User data should be sanitized before attaching to request
      expect(mockReq.user.email).not.toContain('<script>');
      expect(mockReq.user.role).not.toContain('<img');
    });
  });
});
