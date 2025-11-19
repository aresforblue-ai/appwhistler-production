const path = require('path');

module.exports = {
  rootDir: path.resolve(__dirname),
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/frontend/**',
    '!src/**/__mocks__/**',
    '!src/**/__tests__/**'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup/jest.setup.js'],
  modulePathIgnorePatterns: ['<rootDir>/tests/e2e', '<rootDir>/tests/load'],
  reporters: ['default']
};
