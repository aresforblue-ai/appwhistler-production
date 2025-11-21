/**
 * Backend Test Setup File
 * Configures the test environment for Jest
 */

// Load environment variables for testing
require('dotenv').config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';

// Mock console methods to reduce noise in tests (optional)
global.console = {
  ...console,
  // Uncomment to suppress logs during tests
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
};

// Global test timeout
jest.setTimeout(10000);

// Setup database connection pool for tests
let testPool;

beforeAll(async () => {
  // Initialize test database connection if needed
  // testPool = new Pool({ /* test config */ });
});

afterAll(async () => {
  // Close database connections
  if (testPool) {
    await testPool.end();
  }
});

// Clear all mocks after each test
afterEach(() => {
  jest.clearAllMocks();
});
