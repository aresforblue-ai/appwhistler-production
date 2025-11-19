const ORIGINAL_ENV = { ...process.env };

describe('env validator', () => {
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    jest.resetModules();
  });

  test('validateEnvironment captures missing required env', () => {
    process.env = { NODE_ENV: 'development' };
    const { validateEnvironment } = require('../../../src/backend/utils/envValidator');
    const result = validateEnvironment();
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('validateEnvironment passes when required env present', () => {
    process.env = {
      NODE_ENV: 'development',
      JWT_SECRET: 'secret',
      DB_HOST: 'localhost',
      DB_PORT: '5432',
      DB_NAME: 'db',
      DB_USER: 'user',
      DB_PASSWORD: 'pass'
    };
    const { validateEnvironment } = require('../../../src/backend/utils/envValidator');
    const result = validateEnvironment();
    expect(result.valid).toBe(true);
  });
});
