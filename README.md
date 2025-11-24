# AppWhistler

> Truth-first app recommender platform with AI-powered fact-checking

AppWhistler is a full-stack web application that provides verified, trustworthy app recommendations. Built with React, GraphQL, and PostgreSQL, it features real-time updates, AI-powered fact-checking, and enterprise-grade security.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Node](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen.svg)

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
  - [Windows 11 Setup](#windows-11-setup)
  - [macOS/Linux Setup](#macoslinux-setup)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [Testing](#testing)
- [Deployment](#deployment)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [Security](#security)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

## Features

- **Truth Verification**: AI-powered fact-checking system for app claims
- **Real-time Updates**: WebSocket subscriptions for live data
- **User Reviews**: Community-driven ratings and reviews
- **GraphQL API**: Single endpoint with strong typing
- **Dark Mode**: Beautiful glassmorphism UI with dark/light themes
- **Enterprise Security**: JWT auth, rate limiting, input validation, CORS
- **Privacy Compliant**: GDPR/CCPA data export and deletion
- **Background Jobs**: Async processing with Bull/Redis
- **Blockchain Verification**: Optional blockchain-backed trust records
- **Responsive Design**: Mobile-first, accessible interface

## Tech Stack

### Frontend
- **React 18.3.1** - UI library with hooks
- **Vite 6.4.1** - Lightning-fast build tool
- **Apollo Client 4.0.9** - GraphQL client
- **Tailwind CSS 3.4.17** - Utility-first styling
- **Vitest** - Unit testing framework
- **Playwright** - E2E testing

### Backend
- **Node.js** - JavaScript runtime
- **Express 4.18.2** - Web framework
- **Apollo Server 3.13.0** - GraphQL server
- **PostgreSQL** - Primary database
- **Redis** - Caching and job queues
- **Bull 4.12.2** - Background job processing
- **JWT** - Token-based authentication
- **Helmet** - Security headers

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: v16 or higher (v18+ recommended)
  - Download: https://nodejs.org/
- **PostgreSQL**: v12 or higher
  - Windows: https://www.postgresql.org/download/windows/
  - macOS: `brew install postgresql`
  - Linux: `sudo apt-get install postgresql`
- **Redis** (optional, for background jobs):
  - Windows: https://github.com/microsoftarchive/redis/releases
  - macOS: `brew install redis`
  - Linux: `sudo apt-get install redis-server`
- **Git**: For version control
  - Download: https://git-scm.com/downloads

## Installation

### Windows 11 Setup

#### 1. Install Node.js

```powershell
# Download and install from https://nodejs.org/
# Or using Chocolatey:
choco install nodejs-lts

# Verify installation
node --version
npm --version
```

#### 2. Install PostgreSQL

```powershell
# Download installer from https://www.postgresql.org/download/windows/
# During installation:
# - Set password for postgres user (remember this!)
# - Port: 5432 (default)
# - Locale: [Default locale]

# Verify installation (PowerShell)
& 'C:\Program Files\PostgreSQL\15\bin\psql.exe' --version

# Add PostgreSQL to PATH (optional but recommended)
$env:Path += ";C:\Program Files\PostgreSQL\15\bin"

# Set PATH permanently
[Environment]::SetEnvironmentVariable("Path", $env:Path, [System.EnvironmentVariableTarget]::User)
```

#### 3. Install Redis (Optional)

```powershell
# Download from https://github.com/microsoftarchive/redis/releases
# Extract to C:\Redis
# Run redis-server.exe

# Or use Windows Subsystem for Linux (WSL):
wsl --install
wsl
sudo apt-get update
sudo apt-get install redis-server
redis-server --daemonize yes
```

#### 4. Clone and Setup Project

```powershell
# Clone repository
git clone https://github.com/your-username/appwhistler-production.git
cd appwhistler-production

# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..
```

#### 5. Setup Database

```powershell
# Connect to PostgreSQL (enter your password when prompted)
psql -U postgres -h localhost

# In psql prompt, create database:
CREATE DATABASE appwhistler;
\q

# Initialize database schema
cd database
node init.js
cd ..
```

#### 6. Configure Environment Variables

```powershell
# Create .env file in project root
New-Item -Path .env -ItemType File

# Edit .env file (use notepad or your preferred editor)
notepad .env
```

Add the following configuration (see [Configuration](#configuration) section for details):

```env
NODE_ENV=development
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=appwhistler
DB_USER=postgres
DB_PASSWORD=your_postgres_password
JWT_SECRET=your_random_secret_key_min_32_chars
REFRESH_TOKEN_SECRET=your_refresh_secret_key
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5000
```

#### 7. Start the Application

```powershell
# Terminal 1 - Start backend
cd backend
npm start
# Backend will run on http://localhost:5000

# Terminal 2 - Start frontend (new PowerShell window)
npm run dev
# Frontend will run on http://localhost:3000
```

### macOS/Linux Setup

#### 1. Install Dependencies

```bash
# macOS (using Homebrew)
brew install node postgresql redis

# Ubuntu/Debian
sudo apt-get update
sudo apt-get install nodejs npm postgresql redis-server

# Verify installations
node --version
npm --version
psql --version
redis-cli --version
```

#### 2. Start Services

```bash
# macOS
brew services start postgresql
brew services start redis

# Linux
sudo systemctl start postgresql
sudo systemctl start redis-server
```

#### 3. Clone and Setup Project

```bash
# Clone repository
git clone https://github.com/your-username/appwhistler-production.git
cd appwhistler-production

# Install dependencies
npm install
cd backend && npm install && cd ..
```

#### 4. Setup Database

```bash
# Create database
sudo -u postgres createdb appwhistler

# Or using psql:
sudo -u postgres psql
CREATE DATABASE appwhistler;
\q

# Initialize schema
cd database
node init.js
cd ..
```

#### 5. Configure Environment

```bash
# Create .env file
cp .env.example .env  # If example exists
# Or create manually:
touch .env
nano .env  # or vim, code, etc.
```

Add configuration as shown in Windows setup.

#### 6. Start Application

```bash
# Start backend (Terminal 1)
cd backend && npm start

# Start frontend (Terminal 2)
npm run dev
```

## Configuration

### Required Environment Variables

Create a `.env` file in the project root with these required variables:

```env
# Server Configuration
NODE_ENV=development
PORT=5000
API_VERSION=v1

# Database (PostgreSQL)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=appwhistler
DB_USER=postgres
DB_PASSWORD=your_password_here

# Authentication (IMPORTANT: Change these in production!)
JWT_SECRET=generate_a_strong_random_secret_min_32_characters
JWT_EXPIRES_IN=7d
REFRESH_TOKEN_SECRET=another_strong_random_secret

# CORS (comma-separated)
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5000
```

### Optional Services

```env
# Redis (for caching and background jobs)
REDIS_URL=redis://localhost:6379

# Error Monitoring (Sentry)
SENTRY_DSN=https://your-project@sentry.io/123456
SENTRY_TRACES_SAMPLE_RATE=0.1

# Email (SendGrid)
SENDGRID_API_KEY=SG.your_api_key

# AI Fact-Checking (HuggingFace)
HUGGINGFACE_API_KEY=hf_your_api_key

# File Storage (IPFS via Pinata)
PINATA_API_KEY=your_pinata_key
PINATA_SECRET_KEY=your_pinata_secret

# Blockchain (Ethereum)
INFURA_PROJECT_ID=your_infura_id
ALCHEMY_API_KEY=your_alchemy_key
PRIVATE_KEY=your_wallet_private_key
```

### Frontend Environment Variables

Create `.env` in the frontend root (Vite requires `VITE_` prefix):

```env
VITE_API_URL=http://localhost:5000
VITE_WS_URL=ws://localhost:5000
VITE_SENTRY_DSN=https://your-project@sentry.io/123456
```

### Generating Secure Secrets

```bash
# Generate JWT secret (Node.js)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Or using OpenSSL
openssl rand -hex 32

# PowerShell
[Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

## Running the Application

### Development Mode

```bash
# Start backend with auto-reload
cd backend
npm run dev

# Start frontend with HMR
npm run dev
```

### Production Mode

```bash
# Build frontend
npm run build

# Start backend in production
cd backend
NODE_ENV=production npm start

# Serve built frontend (example with serve)
npm install -g serve
serve -s dist -l 3000
```

### Accessing the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **GraphQL Playground**: http://localhost:5000/graphql (dev only)
- **Health Check**: http://localhost:5000/health
- **DB Pool Status**: http://localhost:5000/health/db-pool

### Common Commands

```bash
# Frontend
npm run dev          # Start dev server
npm run build        # Production build
npm run preview      # Preview production build
npm test             # Run unit tests
npm run test:e2e     # Run E2E tests

# Backend
npm start            # Start server
npm run dev          # Start with nodemon (auto-reload)

# Database
cd database && node init.js    # Reset/initialize database
```

## Testing

AppWhistler includes comprehensive testing infrastructure. See [TESTING.md](TESTING.md) for detailed information.

### Quick Start

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage

# Run E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui
```

### Testing on Windows

```powershell
# Ensure dependencies are installed
npm install

# Run tests
npm test

# For E2E tests, install browsers first
npx playwright install
npm run test:e2e
```

## Deployment

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Use strong, unique secrets for JWT tokens
- [ ] Configure production database (not localhost)
- [ ] Set up Redis for production
- [ ] Configure CORS with actual domain
- [ ] Set up SSL/TLS certificates
- [ ] Configure environment variables securely (AWS Secrets Manager, etc.)
- [ ] Set up error monitoring (Sentry)
- [ ] Configure CDN for static assets
- [ ] Set up database backups
- [ ] Configure rate limiting appropriately
- [ ] Review and test all API endpoints
- [ ] Enable logging and monitoring

### Deployment Platforms

#### Heroku

```bash
# Install Heroku CLI
# Windows: choco install heroku-cli
# macOS: brew install heroku/brew/heroku

heroku create appwhistler-app
heroku addons:create heroku-postgresql:hobby-dev
heroku addons:create heroku-redis:hobby-dev
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=your_secret
# ... set other env vars
git push heroku main
```

#### Vercel (Frontend)

```bash
# Install Vercel CLI
npm install -g vercel

# Build and deploy
npm run build
vercel --prod
```

#### AWS EC2

1. Launch EC2 instance (Ubuntu 20.04+)
2. Install Node.js, PostgreSQL, Redis
3. Clone repository
4. Configure environment variables
5. Set up PM2 for process management
6. Configure Nginx as reverse proxy
7. Set up SSL with Let's Encrypt

See deployment guides in `docs/deployment/` for detailed instructions.

## Project Structure

```
appwhistler-production/
├── src/                    # Frontend React application
│   ├── apollo/            # Apollo Client configuration
│   ├── graphql/           # GraphQL queries, mutations, subscriptions
│   ├── App.jsx            # Main application component
│   ├── main.jsx           # Entry point
│   └── index.css          # Global styles
│
├── backend/               # Backend Node.js server
│   ├── middleware/        # Express middleware (auth, rate limiting)
│   ├── queues/           # Background job handlers
│   ├── routes/           # REST API routes
│   ├── utils/            # Utilities (validation, sanitization)
│   ├── server.js         # Express server setup
│   ├── schema.js         # GraphQL schema definitions
│   └── resolvers.js      # GraphQL resolvers
│
├── database/             # Database scripts
│   ├── schema.sql       # PostgreSQL schema
│   ├── seed.sql         # Seed data
│   └── init.js          # Database initialization
│
├── config/              # Configuration files
│   └── secrets.js       # Environment variable management
│
├── public/              # Static assets
├── dist/                # Production build output
├── tests/               # Test files
│   ├── unit/           # Unit tests
│   ├── integration/    # Integration tests
│   └── e2e/            # End-to-end tests
│
├── docs/                # Additional documentation
├── .env                 # Environment variables (not in git)
├── .gitignore          # Git ignore rules
├── package.json        # Frontend dependencies
├── vite.config.js      # Vite configuration
├── tailwind.config.js  # Tailwind configuration
├── README.md           # This file
├── CONTRIBUTING.md     # Contribution guidelines
├── TESTING.md          # Testing documentation
└── CLAUDE.md           # AI assistant development guide
```

## API Documentation

### GraphQL Schema

The API uses GraphQL with a single endpoint: `/graphql`

#### Key Types

- **User**: User accounts with authentication
- **App**: Application listings with metadata
- **Review**: User reviews and ratings
- **FactCheck**: AI-powered fact-check records
- **Bounty**: Rewards for contributions

#### Example Queries

```graphql
# Fetch trending apps
query {
  trendingApps(limit: 10) {
    id
    name
    description
    truthRating
    category
    verificationStatus
  }
}

# Search apps
query {
  searchApps(query: "facebook", category: "social") {
    id
    name
    truthRating
  }
}

# Get user profile
query {
  user(id: "1") {
    id
    username
    email
    role
  }
}
```

#### Example Mutations

```graphql
# Register user
mutation {
  register(input: {
    username: "johndoe"
    email: "john@example.com"
    password: "SecurePass123!"
  }) {
    token
    user {
      id
      username
    }
  }
}

# Create review
mutation {
  createReview(input: {
    appId: "1"
    rating: 5
    content: "Great app!"
  }) {
    id
    rating
    content
  }
}
```

#### Subscriptions

```graphql
# Subscribe to fact-check updates
subscription {
  factCheckAdded(appId: "1") {
    id
    claim
    verdict
    confidence
  }
}
```

For full API documentation, visit http://localhost:5000/graphql in development mode.

### REST Endpoints

- `GET /health` - Health check
- `GET /health/db-pool` - Database connection status
- `POST /api/v1/privacy/data-export` - GDPR data export
- `POST /api/v1/privacy/data-deletion` - GDPR data deletion
- `POST /api/v1/upload/avatar` - Upload user avatar
- `POST /api/v1/upload/app-icon` - Upload app icon

## Troubleshooting

### Common Issues

#### Backend Won't Start

**Problem**: Server crashes with database connection error

**Solution**:
```bash
# Check if PostgreSQL is running
# Windows:
Get-Service -Name postgresql*

# macOS/Linux:
sudo systemctl status postgresql

# Test connection
psql -U postgres -h localhost -d appwhistler
```

#### Frontend Can't Connect to Backend

**Problem**: CORS errors or connection refused

**Solution**:
1. Verify backend is running: `curl http://localhost:5000/health`
2. Check `.env` has `ALLOWED_ORIGINS=http://localhost:3000`
3. Restart both servers

#### Port Already in Use

**Problem**: Error: "Port 3000/5000 is already in use"

**Solution**:
```bash
# Windows (PowerShell):
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process

# macOS/Linux:
lsof -ti:3000 | xargs kill -9
```

#### Database Migration Fails

**Problem**: Schema initialization errors

**Solution**:
```bash
# Drop and recreate database
psql -U postgres
DROP DATABASE appwhistler;
CREATE DATABASE appwhistler;
\q

# Re-initialize
cd database && node init.js
```

#### Redis Connection Fails

**Problem**: Background jobs not processing

**Solution**:
- Redis is optional for development
- App falls back to in-memory queue
- To use Redis: ensure it's running (`redis-cli ping` should return `PONG`)

For more troubleshooting, see [CLAUDE.md](CLAUDE.md#troubleshooting).

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on:

- Code style and conventions
- Commit message format
- Pull request process
- Development workflow
- Testing requirements

### Quick Contribution Guide

1. Fork the repository
2. **Read and agree to [CLA.md](CLA.md)** - Required for all contributors
3. Create a feature branch: `git checkout -b feature/your-feature`
4. Make your changes following our coding standards
5. Write tests for new functionality
6. Ensure all tests pass: `npm test`
7. Commit with conventional commits: `git commit -m "feat: add new feature"`
8. Push to your fork: `git push origin feature/your-feature`
9. Open a pull request

### Brand Protection & Forking

**⚠️ Important for Forks**: If you fork AppWhistler, you **MUST**:
- Change the project name (remove "AppWhistler" branding)
- Replace all logos and branded assets
- Add clear attribution to the original project
- Review [CLA.md](CLA.md) Section 4 for complete requirements

**Resources**:
- [BRAND_PROTECTION.md](BRAND_PROTECTION.md) - Comprehensive brand protection guide
- [CLA.md](CLA.md) - Contributor License Agreement
- [ASSETS_LICENSE.md](ASSETS_LICENSE.md) - Design asset licensing (CC BY-NC 4.0)
- [DMCA_TEMPLATE.md](DMCA_TEMPLATE.md) - Enforcement procedures

**Community Monitoring**: Help protect the brand! See [brand bounty program](.github/ISSUE_TEMPLATE/brand-bounty.md) for reporting violations.

## Security

Security is a top priority for AppWhistler. We've implemented comprehensive security measures and documentation:

- **Report vulnerabilities**: See [SECURITY.md](SECURITY.md) for our security policy and how to report issues
- **Security features**: JWT authentication, rate limiting, input validation, CORS protection, and more
- **Automated scanning**: CodeQL and Dependabot keep dependencies secure
- **Best practices**: See [GITHUB_SETUP.md](GITHUB_SETUP.md) for repository configuration

For developers:
- Never commit `.env` files - use `.env.example` as a template
- Run `./scripts/security-scan.sh` before deployment
- Keep dependencies updated with `npm audit`
- Review [PRE_LAUNCH_CHECKLIST.md](PRE_LAUNCH_CHECKLIST.md) before going to production

## License

This project uses dual licensing:

- **Source Code**: Licensed under the [Apache License 2.0](LICENSE)
- **Design Assets**: Licensed under [CC BY-NC 4.0](ASSETS_LICENSE.md)
- **Trademarks**: "AppWhistler" name and logo are protected trademarks

See [LICENSE](LICENSE) and [ASSETS_LICENSE.md](ASSETS_LICENSE.md) for complete terms.

## Support

- **Documentation**: Check [CLAUDE.md](CLAUDE.md) for detailed architecture
- **Security**: See [SECURITY.md](SECURITY.md) for security policy
- **Issues**: Report bugs via [GitHub Issues](https://github.com/aresforblue-ai/appwhistler-production/issues)
- **Discussions**: Join [GitHub Discussions](https://github.com/aresforblue-ai/appwhistler-production/discussions) for Q&A
- **Email**: appwhistler@icloud.com
## Acknowledgments

- Built with [React](https://react.dev/), [GraphQL](https://graphql.org/), and [PostgreSQL](https://www.postgresql.org/)
- Icons from [Heroicons](https://heroicons.com/)
- UI inspiration from modern design systems
- Thanks to all contributors!

---

**Made with ❤️ by the AppWhistler Team**
