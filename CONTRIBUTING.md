# Contributing to AppWhistler

Thank you for your interest in contributing to AppWhistler! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Style Guide](#code-style-guide)
- [Commit Message Conventions](#commit-message-conventions)
- [Pull Request Process](#pull-request-process)
- [Testing Requirements](#testing-requirements)
- [Documentation Standards](#documentation-standards)
- [Issue Reporting](#issue-reporting)
- [Security Vulnerabilities](#security-vulnerabilities)

## Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inclusive environment for everyone. We expect all contributors to:

- Use welcoming and inclusive language
- Be respectful of differing viewpoints and experiences
- Accept constructive criticism gracefully
- Focus on what is best for the community
- Show empathy towards other community members

### Unacceptable Behavior

- Harassment, trolling, or discriminatory comments
- Personal attacks or insults
- Publishing others' private information without permission
- Other conduct that could reasonably be considered inappropriate

## Getting Started

### Prerequisites

Before contributing, ensure you have:

1. Read the [README.md](README.md) for installation instructions
2. **Read and agree to the [CLA.md](CLA.md)** (Contributor License Agreement)
3. Set up your local development environment
4. Reviewed the [CLAUDE.md](CLAUDE.md) for architecture details
5. Familiarized yourself with the codebase structure
6. Understood brand protection requirements in [BRAND_PROTECTION.md](BRAND_PROTECTION.md)

### Contributor License Agreement (CLA)

**Important**: By contributing to AppWhistler, you agree to our [Contributor License Agreement (CLA)](CLA.md).

**Key Points**:
- You grant us license to use your contributions
- You confirm you have the right to contribute
- **If you fork this project**: You must rebrand and remove all AppWhistler trademarks (see CLA Section 4)
- **Brand protection**: The AppWhistler name, logo, and branding are protected

**How to Sign**: Submit a pull request (automatic agreement) or add your name to CONTRIBUTORS.md

### First-Time Contributors

If this is your first contribution:

1. **Read the [CLA.md](CLA.md)** - Required for all contributors
2. Look for issues labeled `good-first-issue` or `help-wanted`
3. Comment on the issue to express interest
4. Wait for maintainer approval before starting work
5. Ask questions if anything is unclear

### Setting Up Your Development Environment

```bash
# Fork the repository on GitHub
# Clone your fork
git clone https://github.com/YOUR-USERNAME/appwhistler-production.git
cd appwhistler-production

# Add upstream remote
git remote add upstream https://github.com/original-owner/appwhistler-production.git

# Install dependencies
npm install
cd backend && npm install && cd ..

# Set up environment variables
cp .env.example .env
# Edit .env with your local configuration

# Initialize database
cd database
node init.js
cd ..

# Verify setup
npm test
```

## Development Workflow

### Branch Strategy

1. **Main Branch** (`main`): Production-ready code
2. **Feature Branches**: Named `feature/description` or `fix/description`
3. **Always branch from `main`**:

```bash
git checkout main
git pull upstream main
git checkout -b feature/your-feature-name
```

### Making Changes

1. **Create a new branch** for your feature/fix:
   ```bash
   git checkout -b feature/add-notification-system
   ```

2. **Make your changes** following our code style guide

3. **Test your changes**:
   ```bash
   npm test                # Unit tests
   npm run test:e2e        # End-to-end tests
   npm run test:coverage   # Check coverage
   ```

4. **Commit your changes** (see commit conventions below)

5. **Keep your branch up to date**:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

6. **Push to your fork**:
   ```bash
   git push origin feature/add-notification-system
   ```

7. **Open a Pull Request** on GitHub

## Code Style Guide

### General Principles

- **Readability over cleverness**: Write code that's easy to understand
- **Consistency**: Follow existing patterns in the codebase
- **Small functions**: Keep functions focused and under 50 lines
- **Meaningful names**: Use descriptive variable and function names
- **Comments for why, not what**: Explain reasoning, not obvious code

### Frontend (React/JavaScript)

#### Component Structure

```javascript
import React, { useState, useEffect } from 'react';
import { useQuery } from '@apollo/client';

/**
 * Component description
 * @param {Object} props - Component props
 * @param {string} props.appId - Application ID
 * @param {Function} props.onUpdate - Update callback
 */
function AppCard({ appId, onUpdate }) {
  // 1. Hooks first (state, effects, queries)
  const [isLoading, setIsLoading] = useState(true);
  const { data, error } = useQuery(GET_APP, { variables: { appId } });

  // 2. Effects
  useEffect(() => {
    if (data) {
      setIsLoading(false);
      onUpdate?.(data);
    }
  }, [data, onUpdate]);

  // 3. Event handlers
  const handleClick = () => {
    // Handler logic
  };

  // 4. Early returns for loading/error states
  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  // 5. Main render
  return (
    <div className="app-card" onClick={handleClick}>
      {/* Component content */}
    </div>
  );
}

export default AppCard;
```

#### Naming Conventions

- **Components**: PascalCase (`AppCard`, `UserProfile`)
- **Functions/Variables**: camelCase (`handleClick`, `isLoading`)
- **Constants**: UPPER_SNAKE_CASE (`API_ENDPOINT`, `MAX_RETRIES`)
- **Files**: Match component name (`AppCard.jsx`, `userUtils.js`)

#### React Hooks Rules

```javascript
// ✅ Good - Descriptive state names
const [isModalOpen, setIsModalOpen] = useState(false);
const [userProfile, setUserProfile] = useState(null);

// ❌ Bad - Unclear names
const [open, setOpen] = useState(false);
const [data, setData] = useState(null);

// ✅ Good - Cleanup in effects
useEffect(() => {
  const subscription = subscribeToUpdates();
  return () => subscription.unsubscribe();
}, []);

// ❌ Bad - No cleanup
useEffect(() => {
  subscribeToUpdates();
}, []);
```

#### Styling with Tailwind

```javascript
// ✅ Good - Organized classes
className="
  flex items-center justify-between
  px-6 py-4
  bg-white dark:bg-slate-900
  text-slate-800 dark:text-slate-100
  rounded-2xl shadow-lg
  hover:scale-105 transition-transform
"

// ❌ Bad - Unorganized, hard to read
className="flex bg-white text-slate-800 px-6 hover:scale-105 rounded-2xl py-4 items-center shadow-lg dark:bg-slate-900 dark:text-slate-100 justify-between transition-transform"
```

### Backend (Node.js/Express)

#### Resolver Structure

```javascript
// ✅ Good - Clear structure, error handling, validation
const resolvers = {
  Query: {
    /**
     * Fetch trending apps
     * @param {Object} _ - Parent (unused)
     * @param {Object} args - Query arguments
     * @param {number} args.limit - Maximum number of results
     * @param {Object} context - Request context
     * @returns {Promise<Array>} Trending apps
     */
    trendingApps: async (_, { limit = 10 }, { pool, user }) => {
      try {
        // Validate input
        if (limit < 1 || limit > 100) {
          throw createGraphQLError('Limit must be between 1 and 100', 'BAD_USER_INPUT');
        }

        // Query database
        const result = await pool.query(
          'SELECT * FROM apps ORDER BY views DESC, truth_rating DESC LIMIT $1',
          [limit]
        );

        return result.rows;
      } catch (error) {
        console.error('Error fetching trending apps:', error);
        throw createGraphQLError('Failed to fetch trending apps', 'INTERNAL_SERVER_ERROR');
      }
    },
  },
};
```

#### Database Query Safety

```javascript
// ✅ SAFE - Parameterized queries
const user = await pool.query(
  'SELECT * FROM users WHERE email = $1 AND active = $2',
  [email, true]
);

// ❌ DANGEROUS - SQL injection vulnerability
const user = await pool.query(
  `SELECT * FROM users WHERE email = '${email}'`
);

// ✅ Good - Use DataLoader to prevent N+1
const users = await context.loaders.userById.loadMany(userIds);

// ❌ Bad - N+1 query problem
const users = await Promise.all(
  userIds.map(id => pool.query('SELECT * FROM users WHERE id = $1', [id]))
);
```

#### Error Handling

```javascript
// ✅ Good - Specific error handling
const { createGraphQLError } = require('./utils/errorHandler');

try {
  const result = await pool.query('SELECT * FROM apps WHERE id = $1', [id]);
  if (result.rows.length === 0) {
    throw createGraphQLError('App not found', 'NOT_FOUND');
  }
  return result.rows[0];
} catch (error) {
  if (error.extensions?.code === 'NOT_FOUND') {
    throw error;
  }
  console.error('Database error:', error);
  throw createGraphQLError('Internal server error', 'INTERNAL_SERVER_ERROR');
}
```

#### Input Validation & Sanitization

```javascript
const { validateEmail, validatePassword } = require('./utils/validation');
const { sanitizePlainText } = require('./utils/sanitizer');

// ✅ Good - Validate and sanitize all user input
async function registerUser(_, { input }, { pool }) {
  const { email, password, username } = input;

  // Validate
  if (!validateEmail(email)) {
    throw createGraphQLError('Invalid email format', 'BAD_USER_INPUT');
  }
  if (!validatePassword(password)) {
    throw createGraphQLError('Password must be at least 8 characters', 'BAD_USER_INPUT');
  }

  // Sanitize
  const cleanUsername = sanitizePlainText(username);

  // Proceed with registration
  // ...
}
```

### GraphQL Schema Conventions

```graphql
# ✅ Good - Clear, documented schema
"""
User account with authentication and profile information
"""
type User {
  "Unique user identifier"
  id: ID!

  "User's email address (unique)"
  email: String!

  "Display name"
  username: String!

  "Account creation timestamp"
  createdAt: DateTime!

  "Optional profile picture URL"
  avatarUrl: String
}

# ✅ Good - Input types for mutations
input RegisterInput {
  email: String!
  password: String!
  username: String!
}

# ✅ Good - Clear mutation definition
type Mutation {
  """
  Register a new user account
  Returns authentication token and user profile
  """
  register(input: RegisterInput!): AuthPayload!
}

# ❌ Bad - No documentation, unclear types
type User {
  id: ID!
  data: String
  stuff: JSON
}
```

## Commit Message Conventions

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification.

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting, no logic change)
- **refactor**: Code refactoring (no feature change)
- **test**: Adding or updating tests
- **chore**: Maintenance tasks (deps, build, etc.)
- **perf**: Performance improvements
- **ci**: CI/CD changes

### Examples

```bash
# Feature with scope
git commit -m "feat(auth): add two-factor authentication support"

# Bug fix
git commit -m "fix(api): resolve race condition in user registration"

# Documentation
git commit -m "docs(readme): add Windows 11 installation instructions"

# Refactor
git commit -m "refactor(resolvers): extract user validation logic to utility"

# Multi-line commit
git commit -m "$(cat <<'EOF'
feat(notifications): implement real-time notification system

- Add notifications table and GraphQL schema
- Implement WebSocket subscriptions
- Add UI components for notification display
- Include unit and integration tests

Closes #123
EOF
)"
```

### Commit Message Guidelines

- **Use imperative mood**: "add feature" not "added feature"
- **Be concise**: Subject line under 50 characters
- **Body explains why**: Explain reasoning, not obvious changes
- **Reference issues**: Use "Closes #123" or "Fixes #456"
- **Breaking changes**: Use `BREAKING CHANGE:` in footer

## Pull Request Process

### Before Submitting

1. **Ensure all tests pass**:
   ```bash
   npm test
   npm run test:e2e
   ```

2. **Check code coverage** (aim for 80%+):
   ```bash
   npm run test:coverage
   ```

3. **Run linter** (if configured):
   ```bash
   npm run lint
   ```

4. **Update documentation**:
   - Update README.md if adding user-facing features
   - Update CLAUDE.md if changing architecture
   - Add JSDoc comments for new functions
   - Update GraphQL schema documentation

5. **Test manually**:
   - Test in browser (frontend changes)
   - Test GraphQL Playground (backend changes)
   - Test both light and dark modes
   - Test responsive layouts

### PR Title Format

Follow conventional commit format:

```
feat(auth): add OAuth2 Google login
fix(api): resolve memory leak in WebSocket connections
docs(contributing): add PR review guidelines
```

### PR Description Template

```markdown
## Description
Brief description of changes and motivation.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Changes Made
- Bullet point list of specific changes
- Include file names if relevant
- Mention any new dependencies

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] E2E tests added/updated
- [ ] Manual testing completed

## Screenshots (if applicable)
Add screenshots for UI changes.

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] No new warnings generated
- [ ] Tests added and passing
- [ ] Dependent changes merged

## Related Issues
Closes #123
Relates to #456

## Additional Notes
Any additional information for reviewers.
```

### PR Review Process

1. **Automated Checks**: CI/CD pipeline runs tests and linters
2. **Code Review**: Maintainers review code and provide feedback
3. **Address Feedback**: Make requested changes and push updates
4. **Approval**: At least one maintainer approval required
5. **Merge**: Maintainer merges PR using squash or rebase

### Review Criteria

Reviewers will check for:

- **Functionality**: Does it work as intended?
- **Tests**: Are there adequate tests?
- **Code Quality**: Is code readable and maintainable?
- **Performance**: Are there performance implications?
- **Security**: Are there security concerns?
- **Documentation**: Is documentation updated?
- **Breaking Changes**: Are breaking changes documented?

## Testing Requirements

All contributions must include tests. See [TESTING.md](TESTING.md) for detailed guidelines.

### Minimum Requirements

- **Unit tests** for new functions/utilities
- **Integration tests** for new API endpoints
- **E2E tests** for new user-facing features
- **80%+ code coverage** for new code

### Running Tests

```bash
# Run all tests
npm test

# Watch mode (recommended during development)
npm run test:watch

# Coverage report
npm run test:coverage

# E2E tests
npm run test:e2e
```

### Test Examples

See [TESTING.md](TESTING.md) for comprehensive examples.

## Documentation Standards

### Code Comments

```javascript
// ✅ Good - Explains why, not what
// Use exponential backoff to avoid overwhelming the server
// during high traffic periods
await retryWithBackoff(fetchData, { maxRetries: 3 });

// ❌ Bad - States the obvious
// Set retries to 3
const retries = 3;
```

### JSDoc Comments

```javascript
/**
 * Authenticates user and generates JWT token
 *
 * @param {string} email - User's email address
 * @param {string} password - User's password (plain text)
 * @returns {Promise<Object>} Authentication result
 * @returns {string} returns.token - JWT access token
 * @returns {Object} returns.user - User profile object
 * @throws {Error} If credentials are invalid
 *
 * @example
 * const { token, user } = await authenticateUser('user@example.com', 'password123');
 */
async function authenticateUser(email, password) {
  // Implementation
}
```

### GraphQL Schema Documentation

```graphql
"""
User account with authentication and profile information.
All users must verify their email before accessing protected features.
"""
type User {
  "Unique user identifier (UUID v4)"
  id: ID!

  "User's email address (must be unique and verified)"
  email: String!

  "Public display name (3-30 characters, alphanumeric and spaces)"
  username: String!
}
```

## Issue Reporting

### Bug Reports

Use the bug report template:

```markdown
**Describe the bug**
Clear description of the bug.

**To Reproduce**
Steps to reproduce:
1. Go to '...'
2. Click on '...'
3. See error

**Expected behavior**
What you expected to happen.

**Screenshots**
If applicable, add screenshots.

**Environment:**
- OS: [e.g., Windows 11, macOS 13]
- Browser: [e.g., Chrome 120, Firefox 121]
- Node.js version: [e.g., 18.17.0]
- App version: [e.g., 1.0.0]

**Additional context**
Any other relevant information.
```

### Feature Requests

Use the feature request template:

```markdown
**Is your feature request related to a problem?**
Description of the problem.

**Describe the solution you'd like**
Clear description of what you want to happen.

**Describe alternatives you've considered**
Other solutions you've considered.

**Additional context**
Mockups, examples, or other context.
```

## Security Vulnerabilities

### Reporting

**DO NOT** open a public issue for security vulnerabilities.

Instead:
1. Email security@appwhistler.com with details
2. Include "SECURITY" in the subject line
3. Provide detailed reproduction steps
4. We will respond within 48 hours

### Security Best Practices

When contributing, always:

- **Never commit secrets** (API keys, passwords, tokens)
- **Use parameterized queries** to prevent SQL injection
- **Validate and sanitize** all user input
- **Use HTTPS** for all external API calls
- **Follow least privilege** principle for permissions
- **Review dependencies** for known vulnerabilities

## Recognition

Contributors are recognized in:
- GitHub contributors page
- Release notes (for significant contributions)
- Project README (top contributors)

Thank you for contributing to AppWhistler!

## Questions?

- Check [CLAUDE.md](CLAUDE.md) for architecture details
- Check [TESTING.md](TESTING.md) for testing guidelines
- Open a discussion on GitHub
- Email: developers@appwhistler.com

---

**Happy Contributing!**
