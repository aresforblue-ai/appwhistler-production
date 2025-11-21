# Testing Infrastructure Documentation

## Overview

This project now has a complete testing infrastructure set up with three layers of testing:

1. **Backend Unit/Integration Tests** (Jest + Supertest)
2. **Frontend Unit/Component Tests** (Vitest + React Testing Library)
3. **E2E Tests** (Playwright)

## Installation

### Install All Testing Dependencies

```bash
# Install frontend testing dependencies
npm install

# Install backend testing dependencies
cd backend
npm install

# Install Playwright browsers
npx playwright install --with-deps
```

## Running Tests

### Frontend Tests

```bash
# Run all frontend tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Open Vitest UI
npm run test:ui
```

### Backend Tests

```bash
cd backend

# Run all backend tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run tests with verbose output
npm run test:verbose
```

### E2E Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui

# Debug E2E tests
npm run test:e2e:debug

# Run specific test file
npx playwright test e2e/app.spec.js

# Run tests in specific browser
npx playwright test --project=chromium
```

## Test Structure

### Backend Tests (`backend/tests/`)

```
backend/tests/
├── setup.js                          # Test configuration
├── utils/
│   └── validation.test.js            # Example utility tests
├── middleware/
│   └── auth.test.js                  # Middleware tests (to be created)
├── resolvers/
│   └── app.test.js                   # GraphQL resolver tests (to be created)
└── integration/
    └── api.test.js                   # Full API integration tests (to be created)
```

### Frontend Tests (`src/`)

```
src/
├── App.test.jsx                      # Example component test
└── components/
    └── AppCard.test.jsx              # Component tests (to be created)
```

### E2E Tests (`e2e/`)

```
e2e/
└── app.spec.js                       # Example E2E tests
```

## Writing Tests

### Backend Unit Test Example

```javascript
// backend/tests/resolvers/app.test.js
const { app } = require('../../resolvers');

describe('App Resolver', () => {
  it('fetches app by id', async () => {
    const mockPool = {
      query: jest.fn().mockResolvedValue({
        rows: [{ id: 1, name: 'Test App' }]
      })
    };

    const result = await app(null, { id: 1 }, { pool: mockPool });

    expect(result).toEqual({ id: 1, name: 'Test App' });
    expect(mockPool.query).toHaveBeenCalledWith(
      expect.stringContaining('SELECT'),
      [1]
    );
  });
});
```

### Frontend Component Test Example

```javascript
// src/components/AppCard.test.jsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import AppCard from './AppCard';

describe('AppCard', () => {
  it('renders app information', () => {
    const mockApp = {
      id: 1,
      name: 'Test App',
      truthRating: 85,
      category: 'Social Media'
    };

    render(<AppCard app={mockApp} />);

    expect(screen.getByText('Test App')).toBeInTheDocument();
    expect(screen.getByText(/85/)).toBeInTheDocument();
  });
});
```

### E2E Test Example

```javascript
// e2e/user-flow.spec.js
import { test, expect } from '@playwright/test';

test('user can search and view app details', async ({ page }) => {
  await page.goto('/');

  // Search for app
  await page.fill('input[placeholder*="Search"]', 'Facebook');
  await page.press('input[placeholder*="Search"]', 'Enter');

  // Click on first result
  await page.click('.app-card:first-child');

  // Verify app details page loaded
  await expect(page.locator('h1')).toContainText('Facebook');
});
```

## Coverage Requirements

The following coverage thresholds are enforced:

- **Branches**: 70%
- **Functions**: 70%
- **Lines**: 70%
- **Statements**: 70%

To view coverage reports:

```bash
# Frontend coverage
npm run test:coverage
open coverage/index.html

# Backend coverage
cd backend
npm run test:coverage
open coverage/lcov-report/index.html
```

## Continuous Integration

Tests run automatically on every push and pull request via GitHub Actions.

See `.github/workflows/test.yml` for the CI configuration.

### CI Pipeline

1. **Backend Tests**: Run with PostgreSQL and Redis services
2. **Frontend Tests**: Run with coverage reporting
3. **E2E Tests**: Run against a live backend
4. **Lint & Format**: Check code quality (when configured)

## Mocking

### Mocking External APIs

```javascript
// Backend
jest.mock('../../utils/email', () => ({
  sendEmail: jest.fn().mockResolvedValue({ success: true })
}));

// Frontend
vi.mock('./api/client', () => ({
  fetchApps: vi.fn().mockResolvedValue([])
}));
```

### Mocking GraphQL Queries

```javascript
import { MockedProvider } from '@apollo/client/testing';

const mocks = [
  {
    request: {
      query: GET_APPS,
      variables: { limit: 10 }
    },
    result: {
      data: {
        apps: [{ id: 1, name: 'Test App' }]
      }
    }
  }
];

render(
  <MockedProvider mocks={mocks}>
    <App />
  </MockedProvider>
);
```

## Best Practices

### 1. Test Naming

```javascript
// ✅ Good
it('should fetch user by id')
it('renders error message when API fails')

// ❌ Bad
it('test1')
it('works')
```

### 2. Arrange-Act-Assert Pattern

```javascript
it('updates user profile', async () => {
  // Arrange
  const mockUser = { id: 1, name: 'John' };
  const mockPool = { query: jest.fn() };

  // Act
  const result = await updateUser(mockUser, mockPool);

  // Assert
  expect(result.name).toBe('John');
  expect(mockPool.query).toHaveBeenCalled();
});
```

### 3. Cleanup

```javascript
// Frontend (Vitest)
afterEach(() => {
  cleanup(); // Automatically done by setup.js
  vi.clearAllMocks();
});

// Backend (Jest)
afterEach(() => {
  jest.clearAllMocks();
});

afterAll(async () => {
  await pool.end(); // Close DB connections
});
```

### 4. Async Testing

```javascript
// ✅ Good - Using async/await
it('fetches data', async () => {
  const data = await fetchData();
  expect(data).toBeDefined();
});

// ❌ Bad - Missing await
it('fetches data', () => {
  const data = fetchData(); // Returns promise, not data!
  expect(data).toBeDefined(); // Will fail
});
```

## Troubleshooting

### Tests Timing Out

Increase timeout in config:

```javascript
// jest.config.js
testTimeout: 10000 // 10 seconds

// vitest.config.js
test: { testTimeout: 10000 }

// playwright.config.js
timeout: 30 * 1000 // 30 seconds
```

### Database Connection Issues

Ensure PostgreSQL is running and test database exists:

```bash
createdb appwhistler_test
cd database
DB_NAME=appwhistler_test node init.js
```

### Mock Not Working

Check mock is defined before import:

```javascript
// ✅ Good
vi.mock('./api');
import { fetchData } from './api';

// ❌ Bad
import { fetchData } from './api';
vi.mock('./api'); // Too late!
```

### Playwright Browser Issues

Reinstall browsers:

```bash
npx playwright install --with-deps
```

## Next Steps

To expand the testing infrastructure:

1. Add more unit tests for utilities (`backend/utils/`)
2. Add resolver tests for all GraphQL operations
3. Add component tests for frontend components
4. Add integration tests for full API flows
5. Add E2E tests for critical user journeys
6. Set up visual regression testing (optional)
7. Configure ESLint and Prettier for code quality

## Resources

- **Vitest**: https://vitest.dev/
- **Jest**: https://jestjs.io/
- **React Testing Library**: https://testing-library.com/react
- **Playwright**: https://playwright.dev/
- **Testing Best Practices**: https://kentcdodds.com/blog/common-mistakes-with-react-testing-library
