# Testing Guide for AppWhistler

This document provides comprehensive guidelines for testing the AppWhistler application, including setup instructions, writing tests, running tests, and best practices.

## Table of Contents

- [Overview](#overview)
- [Testing Infrastructure](#testing-infrastructure)
- [Setup](#setup)
  - [Windows 11 Setup](#windows-11-setup)
  - [macOS/Linux Setup](#macoslinux-setup)
- [Running Tests](#running-tests)
- [Writing Tests](#writing-tests)
  - [Unit Tests](#unit-tests)
  - [Integration Tests](#integration-tests)
  - [End-to-End Tests](#end-to-end-tests)
- [Test Coverage](#test-coverage)
- [Testing Best Practices](#testing-best-practices)
- [Continuous Integration](#continuous-integration)
- [Troubleshooting](#troubleshooting)

## Overview

AppWhistler uses a comprehensive testing strategy with three layers:

1. **Unit Tests**: Test individual functions and components in isolation
2. **Integration Tests**: Test API endpoints and database interactions
3. **End-to-End (E2E) Tests**: Test complete user workflows in a browser

### Testing Stack

- **Frontend Testing**:
  - **Vitest**: Fast unit test runner
  - **React Testing Library**: Component testing utilities
  - **jsdom**: Browser environment simulation
  - **Playwright**: E2E testing framework

- **Backend Testing**:
  - **Jest**: Test framework (to be configured)
  - **Supertest**: HTTP assertions

### Coverage Goals

- **Unit Tests**: 80%+ coverage for utilities and business logic
- **Integration Tests**: 100% of API endpoints
- **E2E Tests**: All critical user flows

## Testing Infrastructure

### Current Setup

The project is configured with:

```json
{
  "scripts": {
    "test": "vitest",                    // Run unit tests
    "test:watch": "vitest --watch",      // Watch mode
    "test:coverage": "vitest --coverage", // Coverage report
    "test:ui": "vitest --ui",            // Visual test UI
    "test:e2e": "playwright test",       // E2E tests
    "test:e2e:ui": "playwright test --ui", // E2E with UI
    "test:e2e:debug": "playwright test --debug" // Debug E2E
  }
}
```

### Test File Structure

```
appwhistler-production/
├── src/
│   ├── __tests__/              # Frontend unit tests
│   │   ├── App.test.jsx
│   │   ├── components/
│   │   └── utils/
│   ├── App.jsx
│   └── ...
│
├── backend/
│   ├── __tests__/              # Backend unit tests
│   │   ├── resolvers.test.js
│   │   ├── utils/
│   │   └── middleware/
│   ├── resolvers.js
│   └── ...
│
├── tests/
│   ├── integration/            # API integration tests
│   │   ├── auth.test.js
│   │   ├── apps.test.js
│   │   └── reviews.test.js
│   │
│   └── e2e/                    # End-to-end tests
│       ├── login.spec.js
│       ├── app-search.spec.js
│       └── review-submission.spec.js
│
├── vitest.config.js            # Vitest configuration
└── playwright.config.js        # Playwright configuration
```

## Setup

### Windows 11 Setup

#### 1. Install Test Dependencies

```powershell
# Install frontend testing dependencies
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom @vitest/ui

# Install Playwright for E2E tests
npm install -D @playwright/test
npx playwright install
```

#### 2. Create Vitest Configuration

Create `vitest.config.js` in the project root:

```javascript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.config.js',
        '**/*.test.{js,jsx}',
        '**/tests/**',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

#### 3. Create Test Setup File

Create `src/tests/setup.js`:

```javascript
import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Add custom matchers
expect.extend({
  // Custom matchers can be added here
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock;
```

#### 4. Create Playwright Configuration

Create `playwright.config.js` in the project root:

```javascript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

#### 5. Verify Installation

```powershell
# Run tests to verify setup
npm test

# View test UI
npm run test:ui

# Run E2E tests
npm run test:e2e
```

### macOS/Linux Setup

Setup is identical to Windows 11. Follow the same steps using bash/zsh instead of PowerShell.

## Running Tests

### Unit Tests

```bash
# Run all unit tests
npm test

# Watch mode (automatically re-run on file changes)
npm run test:watch

# Run specific test file
npm test -- src/__tests__/App.test.jsx

# Run tests matching a pattern
npm test -- --grep "authentication"

# Visual test UI
npm run test:ui
```

### Coverage Reports

```bash
# Generate coverage report
npm run test:coverage

# Output:
# - Terminal: Summary of coverage
# - ./coverage/index.html: Detailed HTML report
# - ./coverage/coverage-final.json: JSON report

# View coverage report (Windows)
start coverage/index.html

# View coverage report (macOS)
open coverage/index.html

# View coverage report (Linux)
xdg-open coverage/index.html
```

### E2E Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run E2E tests with UI (recommended for debugging)
npm run test:e2e:ui

# Run in debug mode
npm run test:e2e:debug

# Run specific test file
npx playwright test tests/e2e/login.spec.js

# Run specific browser
npx playwright test --project=chromium

# Run in headed mode (see browser)
npx playwright test --headed
```

### Windows-Specific Commands

```powershell
# Run tests in PowerShell
npm test

# Run with specific shell
cmd /c "npm test"

# Run E2E with specific browser
npx playwright test --project=chromium --headed
```

## Writing Tests

### Unit Tests

#### Frontend Component Test Example

Create `src/__tests__/App.test.jsx`:

```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import App from '../App';
import { GET_TRENDING_APPS } from '../graphql/queries';

// Mock data
const mockApps = [
  {
    id: '1',
    name: 'Test App',
    description: 'Test description',
    truthRating: 4.5,
    category: 'Productivity',
    verificationStatus: 'verified',
  },
];

// Mock GraphQL response
const mocks = [
  {
    request: {
      query: GET_TRENDING_APPS,
      variables: { limit: 10 },
    },
    result: {
      data: {
        trendingApps: mockApps,
      },
    },
  },
];

describe('App Component', () => {
  beforeEach(() => {
    // Reset mocks before each test
    localStorage.clear();
  });

  it('renders the app title', () => {
    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <App />
      </MockedProvider>
    );

    expect(screen.getByText(/AppWhistler/i)).toBeInTheDocument();
  });

  it('toggles dark mode', () => {
    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <App />
      </MockedProvider>
    );

    const darkModeButton = screen.getByRole('button', { name: /toggle dark mode/i });

    // Initially light mode
    expect(document.documentElement.classList.contains('dark')).toBe(false);

    // Toggle to dark mode
    fireEvent.click(darkModeButton);
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    // Toggle back to light mode
    fireEvent.click(darkModeButton);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('loads and displays trending apps', async () => {
    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <App />
      </MockedProvider>
    );

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.getByText('Test App')).toBeInTheDocument();
    });

    expect(screen.getByText('Test description')).toBeInTheDocument();
  });

  it('filters apps by search query', async () => {
    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <App />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Test App')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search apps/i);
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

    // App should be filtered out
    expect(screen.queryByText('Test App')).not.toBeInTheDocument();
  });
});
```

#### Utility Function Test Example

Create `src/__tests__/utils/validation.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import { validateEmail, validatePassword } from '@/utils/validation';

describe('Validation Utils', () => {
  describe('validateEmail', () => {
    it('accepts valid email addresses', () => {
      expect(validateEmail('user@example.com')).toBe(true);
      expect(validateEmail('test.user+tag@domain.co.uk')).toBe(true);
    });

    it('rejects invalid email addresses', () => {
      expect(validateEmail('invalid')).toBe(false);
      expect(validateEmail('user@')).toBe(false);
      expect(validateEmail('@example.com')).toBe(false);
      expect(validateEmail('user @example.com')).toBe(false);
    });

    it('handles edge cases', () => {
      expect(validateEmail('')).toBe(false);
      expect(validateEmail(null)).toBe(false);
      expect(validateEmail(undefined)).toBe(false);
    });
  });

  describe('validatePassword', () => {
    it('accepts strong passwords', () => {
      expect(validatePassword('SecurePass123!')).toBe(true);
      expect(validatePassword('MyP@ssw0rd')).toBe(true);
    });

    it('rejects weak passwords', () => {
      expect(validatePassword('short')).toBe(false); // Too short
      expect(validatePassword('12345678')).toBe(false); // No letters
      expect(validatePassword('password')).toBe(false); // No numbers
    });
  });
});
```

### Integration Tests

#### Backend Resolver Test Example

Create `backend/__tests__/resolvers/auth.test.js`:

```javascript
const { ApolloServer } = require('apollo-server-express');
const typeDefs = require('../../schema');
const resolvers = require('../../resolvers');
const { Pool } = require('pg');

describe('Authentication Resolvers', () => {
  let server;
  let pool;

  beforeAll(async () => {
    // Set up test database
    pool = new Pool({
      host: 'localhost',
      database: 'appwhistler_test',
      user: 'postgres',
      password: 'postgres',
    });

    server = new ApolloServer({
      typeDefs,
      resolvers,
      context: () => ({
        pool,
        user: null,
      }),
    });

    // Initialize test database
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        username VARCHAR(255) NOT NULL
      )
    `);
  });

  afterAll(async () => {
    // Clean up
    await pool.query('DROP TABLE IF EXISTS users');
    await pool.end();
  });

  beforeEach(async () => {
    // Clear users before each test
    await pool.query('DELETE FROM users');
  });

  describe('register mutation', () => {
    it('creates a new user and returns token', async () => {
      const result = await server.executeOperation({
        query: `
          mutation Register($input: RegisterInput!) {
            register(input: $input) {
              token
              user {
                id
                email
                username
              }
            }
          }
        `,
        variables: {
          input: {
            email: 'test@example.com',
            password: 'SecurePass123!',
            username: 'testuser',
          },
        },
      });

      expect(result.errors).toBeUndefined();
      expect(result.data.register.token).toBeTruthy();
      expect(result.data.register.user.email).toBe('test@example.com');
      expect(result.data.register.user.username).toBe('testuser');
    });

    it('rejects duplicate email', async () => {
      const input = {
        email: 'test@example.com',
        password: 'SecurePass123!',
        username: 'testuser',
      };

      // Register first user
      await server.executeOperation({
        query: `
          mutation Register($input: RegisterInput!) {
            register(input: $input) {
              token
            }
          }
        `,
        variables: { input },
      });

      // Try to register with same email
      const result = await server.executeOperation({
        query: `
          mutation Register($input: RegisterInput!) {
            register(input: $input) {
              token
            }
          }
        `,
        variables: { input },
      });

      expect(result.errors).toBeDefined();
      expect(result.errors[0].message).toContain('already exists');
    });

    it('validates email format', async () => {
      const result = await server.executeOperation({
        query: `
          mutation Register($input: RegisterInput!) {
            register(input: $input) {
              token
            }
          }
        `,
        variables: {
          input: {
            email: 'invalid-email',
            password: 'SecurePass123!',
            username: 'testuser',
          },
        },
      });

      expect(result.errors).toBeDefined();
      expect(result.errors[0].message).toContain('Invalid email');
    });
  });

  describe('login mutation', () => {
    beforeEach(async () => {
      // Create test user
      await server.executeOperation({
        query: `
          mutation Register($input: RegisterInput!) {
            register(input: $input) {
              token
            }
          }
        `,
        variables: {
          input: {
            email: 'test@example.com',
            password: 'SecurePass123!',
            username: 'testuser',
          },
        },
      });
    });

    it('logs in with correct credentials', async () => {
      const result = await server.executeOperation({
        query: `
          mutation Login($email: String!, $password: String!) {
            login(email: $email, password: $password) {
              token
              user {
                email
              }
            }
          }
        `,
        variables: {
          email: 'test@example.com',
          password: 'SecurePass123!',
        },
      });

      expect(result.errors).toBeUndefined();
      expect(result.data.login.token).toBeTruthy();
      expect(result.data.login.user.email).toBe('test@example.com');
    });

    it('rejects incorrect password', async () => {
      const result = await server.executeOperation({
        query: `
          mutation Login($email: String!, $password: String!) {
            login(email: $email, password: $password) {
              token
            }
          }
        `,
        variables: {
          email: 'test@example.com',
          password: 'WrongPassword',
        },
      });

      expect(result.errors).toBeDefined();
      expect(result.errors[0].message).toContain('Invalid credentials');
    });
  });
});
```

### End-to-End Tests

#### E2E Test Example

Create `tests/e2e/login.spec.js`:

```javascript
import { test, expect } from '@playwright/test';

test.describe('User Authentication', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to homepage before each test
    await page.goto('/');
  });

  test('user can register a new account', async ({ page }) => {
    // Click register button
    await page.click('button:has-text("Register")');

    // Fill registration form
    await page.fill('input[name="email"]', 'newuser@example.com');
    await page.fill('input[name="username"]', 'newuser');
    await page.fill('input[name="password"]', 'SecurePass123!');

    // Submit form
    await page.click('button[type="submit"]:has-text("Create Account")');

    // Wait for success message
    await expect(page.locator('text=Welcome to AppWhistler')).toBeVisible();

    // Verify user is logged in
    await expect(page.locator('button:has-text("newuser")')).toBeVisible();
  });

  test('user can log in with existing account', async ({ page }) => {
    // Click login button
    await page.click('button:has-text("Login")');

    // Fill login form
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'SecurePass123!');

    // Submit form
    await page.click('button[type="submit"]:has-text("Sign In")');

    // Wait for redirect
    await page.waitForURL('/dashboard');

    // Verify logged in
    await expect(page.locator('text=Dashboard')).toBeVisible();
  });

  test('shows error for invalid credentials', async ({ page }) => {
    await page.click('button:has-text("Login")');

    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'WrongPassword');

    await page.click('button[type="submit"]:has-text("Sign In")');

    // Verify error message
    await expect(page.locator('text=Invalid credentials')).toBeVisible();
  });

  test('user can log out', async ({ page }) => {
    // Log in first
    await page.click('button:has-text("Login")');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'SecurePass123!');
    await page.click('button[type="submit"]:has-text("Sign In")');

    // Wait for login to complete
    await page.waitForURL('/dashboard');

    // Click logout
    await page.click('button:has-text("Logout")');

    // Verify logged out
    await expect(page.locator('button:has-text("Login")')).toBeVisible();
  });
});
```

#### E2E Test for App Search

Create `tests/e2e/app-search.spec.js`:

```javascript
import { test, expect } from '@playwright/test';

test.describe('App Search', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('can search for apps', async ({ page }) => {
    // Type in search box
    await page.fill('input[placeholder*="Search"]', 'facebook');

    // Wait for results to load
    await page.waitForTimeout(500);

    // Verify filtered results
    const appCards = page.locator('.app-card');
    await expect(appCards.first()).toContainText('facebook', { ignoreCase: true });
  });

  test('can filter by category', async ({ page }) => {
    // Click category filter
    await page.click('button:has-text("Category")');
    await page.click('text=Social Media');

    // Wait for filtered results
    await page.waitForTimeout(500);

    // Verify all visible cards are in the selected category
    const categories = page.locator('.app-card .category');
    const count = await categories.count();

    for (let i = 0; i < count; i++) {
      await expect(categories.nth(i)).toContainText('Social Media');
    }
  });

  test('shows no results message for nonexistent apps', async ({ page }) => {
    await page.fill('input[placeholder*="Search"]', 'nonexistentapp12345');
    await page.waitForTimeout(500);

    await expect(page.locator('text=No apps found')).toBeVisible();
  });

  test('can view app details', async ({ page }) => {
    // Click on first app card
    await page.click('.app-card:first-child');

    // Verify modal or detail page opens
    await expect(page.locator('text=Truth Rating')).toBeVisible();
    await expect(page.locator('text=Reviews')).toBeVisible();
  });
});
```

## Test Coverage

### Viewing Coverage Reports

```bash
# Generate coverage report
npm run test:coverage

# View in browser (Windows)
start coverage/index.html

# View in browser (macOS)
open coverage/index.html

# View in browser (Linux)
xdg-open coverage/index.html
```

### Coverage Thresholds

Configure minimum coverage in `vitest.config.js`:

```javascript
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      lines: 80,
      functions: 80,
      branches: 75,
      statements: 80,
    },
  },
});
```

### What to Test

**High Priority**:
- Authentication and authorization logic
- Data validation and sanitization
- Database queries and mutations
- API endpoints
- Critical user workflows

**Medium Priority**:
- Utility functions
- UI components
- State management
- Error handling

**Low Priority**:
- Styling
- Configuration files
- Mock data

## Testing Best Practices

### General Principles

1. **Test behavior, not implementation**:
   ```javascript
   // ✅ Good - Test user-facing behavior
   it('shows error when login fails', async () => {
     await fillForm({ email: 'invalid', password: 'wrong' });
     await clickSubmit();
     expect(screen.getByText('Invalid credentials')).toBeVisible();
   });

   // ❌ Bad - Test implementation details
   it('calls setError with correct message', async () => {
     const setError = vi.fn();
     render(<LoginForm setError={setError} />);
     // Testing internal state management
   });
   ```

2. **Arrange, Act, Assert (AAA) pattern**:
   ```javascript
   it('adds item to cart', () => {
     // Arrange: Set up test data
     const cart = new ShoppingCart();
     const item = { id: 1, name: 'Book', price: 10 };

     // Act: Perform action
     cart.addItem(item);

     // Assert: Verify result
     expect(cart.items).toHaveLength(1);
     expect(cart.total).toBe(10);
   });
   ```

3. **Keep tests isolated**:
   ```javascript
   // ✅ Good - Each test is independent
   beforeEach(() => {
     // Reset state before each test
     localStorage.clear();
     database.reset();
   });

   // ❌ Bad - Tests depend on each other
   it('creates user', () => { /* ... */ });
   it('updates user created in previous test', () => { /* ... */ });
   ```

4. **Use descriptive test names**:
   ```javascript
   // ✅ Good - Clear what is being tested
   it('shows validation error when email is invalid');
   it('redirects to dashboard after successful login');

   // ❌ Bad - Unclear test purpose
   it('works');
   it('test1');
   ```

5. **Test edge cases**:
   ```javascript
   describe('divide', () => {
     it('divides positive numbers', () => {
       expect(divide(10, 2)).toBe(5);
     });

     it('handles division by zero', () => {
       expect(() => divide(10, 0)).toThrow('Division by zero');
     });

     it('handles negative numbers', () => {
       expect(divide(-10, 2)).toBe(-5);
     });

     it('handles decimals', () => {
       expect(divide(10, 3)).toBeCloseTo(3.33, 2);
     });
   });
   ```

### Frontend-Specific Best Practices

1. **Use React Testing Library queries properly**:
   ```javascript
   // ✅ Good - Use accessible queries
   screen.getByRole('button', { name: 'Submit' });
   screen.getByLabelText('Email');
   screen.getByText('Welcome');

   // ❌ Bad - Test implementation details
   screen.getByTestId('submit-button');
   wrapper.find('.button').at(0);
   ```

2. **Wait for async operations**:
   ```javascript
   // ✅ Good - Use waitFor
   await waitFor(() => {
     expect(screen.getByText('Data loaded')).toBeInTheDocument();
   });

   // ❌ Bad - Arbitrary timeouts
   await new Promise(resolve => setTimeout(resolve, 1000));
   expect(screen.getByText('Data loaded')).toBeInTheDocument();
   ```

3. **Mock external dependencies**:
   ```javascript
   // Mock Apollo Client
   const mocks = [
     {
       request: { query: GET_USER, variables: { id: '1' } },
       result: { data: { user: { id: '1', name: 'John' } } },
     },
   ];

   render(
     <MockedProvider mocks={mocks}>
       <UserProfile userId="1" />
     </MockedProvider>
   );
   ```

### Backend-Specific Best Practices

1. **Use test database**:
   ```javascript
   // Use separate test database
   const pool = new Pool({
     database: 'appwhistler_test',
     // ... other config
   });
   ```

2. **Clean up after tests**:
   ```javascript
   afterEach(async () => {
     await pool.query('DELETE FROM users');
     await pool.query('DELETE FROM apps');
   });

   afterAll(async () => {
     await pool.end();
   });
   ```

3. **Test error scenarios**:
   ```javascript
   it('handles database connection error', async () => {
     // Mock database error
     pool.query.mockRejectedValueOnce(new Error('Connection lost'));

     const result = await resolver();

     expect(result.errors).toBeDefined();
     expect(result.errors[0].message).toContain('Database error');
   });
   ```

## Continuous Integration

### GitHub Actions Example

Create `.github/workflows/test.yml`:

```yaml
name: Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: appwhistler_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: |
          npm ci
          cd backend && npm ci && cd ..

      - name: Run unit tests
        run: npm test -- --run

      - name: Run coverage
        run: npm run test:coverage

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

## Troubleshooting

### Common Issues

#### Tests Timing Out

```javascript
// Increase timeout for slow tests
it('slow operation', async () => {
  // ...
}, 10000); // 10 second timeout

// Or in Vitest config
export default defineConfig({
  test: {
    testTimeout: 10000,
  },
});
```

#### Mock Not Working

```javascript
// Ensure mocks are properly set up
beforeEach(() => {
  vi.clearAllMocks(); // Clear mock history
  vi.resetAllMocks(); // Reset mock implementation
});
```

#### E2E Tests Failing Intermittently

```javascript
// Use explicit waits instead of fixed timeouts
await page.waitForSelector('.app-card', { state: 'visible' });

// Increase timeout for slow operations
await page.click('button', { timeout: 10000 });

// Use retry logic in Playwright config
export default defineConfig({
  retries: 2, // Retry failed tests
});
```

#### Coverage Not Generated

```bash
# Install coverage provider
npm install -D @vitest/coverage-v8

# Verify configuration
npm run test:coverage -- --reporter=verbose
```

### Windows-Specific Issues

#### PowerShell Execution Policy

```powershell
# If script execution is blocked
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Run tests
npm test
```

#### Path Issues

```javascript
// Use path.resolve for cross-platform compatibility
import path from 'path';
const testFile = path.resolve(__dirname, 'test-data.json');
```

## Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Playwright Documentation](https://playwright.dev/)
- [Jest Documentation](https://jestjs.io/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

---

**Happy Testing!**
