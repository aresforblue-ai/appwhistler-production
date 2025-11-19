const path = require('path');

module.exports = {
  rootDir: path.resolve(__dirname),
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverage: true,
  collectCoverageFrom: [
    'src/backend/utils/{cursor,pagination,validation,sanitizer,errorHandler,envValidator}.js',
    'src/ai/factChecker.js'
  ],
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 75,
      lines: 75,
      statements: 75
    }
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup/jest.setup.js'],
  modulePathIgnorePatterns: ['<rootDir>/tests/e2e', '<rootDir>/tests/load'],
  reporters: ['default']
};
