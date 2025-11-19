const { GraphQLError } = require('graphql');
const {
  createGraphQLError,
  handleValidationErrors,
  safeDatabaseOperation,
  withErrorHandling,
  formatErrorResponse
} = require('../../../src/backend/utils/errorHandler');

describe('error handler utilities', () => {
  test('createGraphQLError sets code and status', () => {
    const err = createGraphQLError('Not allowed', 'UNAUTHORIZED');
    expect(err).toBeInstanceOf(GraphQLError);
    expect(err.extensions.code).toBe('UNAUTHORIZED');
    expect(err.extensions.statusCode).toBe(403);
  });

  test('handleValidationErrors returns GraphQLError when invalid', () => {
    const validationResult = {
      valid: false,
      errors: { email: 'Invalid email' }
    };
    const err = handleValidationErrors(validationResult, 'register');
    expect(err).toBeInstanceOf(GraphQLError);
    expect(err.message).toContain('Validation failed');
  });

  test('safeDatabaseOperation wraps failures with GraphQLError', async () => {
    const logger = { error: jest.fn() };
    await expect(
      safeDatabaseOperation(async () => {
        throw new Error('boom');
      }, 'Test Query', logger)
    ).rejects.toBeInstanceOf(GraphQLError);
    expect(logger.error).toHaveBeenCalled();
  });

  test('withErrorHandling rethrows GraphQLErrors and wraps others', async () => {
    const resolver = jest.fn().mockResolvedValue('ok');
    const wrapped = withErrorHandling(resolver);
    await expect(wrapped({}, {}, {}, { fieldName: 'demo' })).resolves.toBe('ok');

    const gqlError = new GraphQLError('nope');
    resolver.mockRejectedValueOnce(gqlError);
    await expect(wrapped({}, {}, {}, { fieldName: 'demo' })).rejects.toBe(gqlError);

    resolver.mockRejectedValueOnce(new Error('boom'));
    await expect(wrapped({}, {}, {}, { fieldName: 'demo' })).rejects.toBeInstanceOf(GraphQLError);
  });

  test('formatErrorResponse adds code and status', () => {
    const response = formatErrorResponse(new Error('bad request'), 'BAD_USER_INPUT');
    expect(response.success).toBe(false);
    expect(response.error.code).toBe('BAD_USER_INPUT');
    expect(response.error.statusCode).toBe(400);
  });
});
