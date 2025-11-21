# AppWhistler Production

A full-stack application for tracking and rating mobile applications with truth ratings, fact-checking, and real-time updates.

## Tech Stack

### Frontend
- **React 18** with Vite
- **Apollo Client** for GraphQL
- **Tailwind CSS** for styling
- **GraphQL Subscriptions** via WebSockets

### Backend
- **Node.js** with Express
- **Apollo Server** for GraphQL API
- **PostgreSQL** (production) / SQLite (development)
- **Socket.io** for WebSocket connections
- **Bull** for background job processing
- **Sentry** for error tracking
- **JWT** for authentication

## Project Structure

```
appwhistler-production/
├── backend/              # Backend Node.js server
│   ├── middleware/       # Auth, rate limiting, GraphQL complexity
│   ├── premium/          # API key management
│   ├── queues/           # Background job processing
│   ├── routes/           # REST endpoints (privacy, uploads)
│   ├── utils/            # Utility functions (validation, sanitization, email)
│   ├── resolvers.js      # GraphQL resolvers
│   ├── schema.js         # GraphQL schema
│   └── server.js         # Main server entry point
├── config/               # Configuration management
│   └── secrets.js        # Secrets management (AWS-ready)
├── database/             # Database setup
│   ├── init.js           # DB initialization
│   ├── schema.sql        # PostgreSQL schema
│   └── seed.sql          # Sample data
├── src/                  # Frontend React application
│   ├── apollo/           # Apollo Client setup
│   ├── graphql/          # GraphQL queries and mutations
│   ├── App.jsx           # Main application component
│   ├── main.jsx          # Entry point
│   └── index.css         # Tailwind styles
└── index.html            # Vite HTML template
```

## Prerequisites

- **Node.js** 18+ (recommended: use nvm)
- **PostgreSQL** 14+ (production) or SQLite (development)
- **npm** 8+ or **yarn** 1.22+

## Setup Instructions

### 1. Clone the Repository

```bash
git clone <repository-url>
cd appwhistler-production
```

### 2. Install Dependencies

Install frontend dependencies:
```bash
npm install
```

Install backend dependencies:
```bash
cd backend
npm install
cd ..
```

### 3. Environment Configuration

Create a `.env` file in the project root:

```bash
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=appwhistler
DB_USER=postgres
DB_PASSWORD=your_password

# For SQLite (development)
# DATABASE_URL=./dev.db

# Server Configuration
PORT=5000
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your_jwt_secret_here
REFRESH_TOKEN_SECRET=your_refresh_token_secret_here
JWT_EXPIRES_IN=1h

# CORS Configuration
CORS_ORIGIN=http://localhost:3000

# Optional: Sentry (for error tracking)
SENTRY_DSN=your_sentry_dsn_here

# Optional: AWS Secrets Manager
# AWS_REGION=us-east-1
# AWS_SECRET_NAME=appwhistler/secrets
```

**Important:** Never commit the `.env` file to version control. It's already in `.gitignore`.

### 4. Database Setup

#### Option A: PostgreSQL (Recommended for Production)

1. Create the database:
```bash
createdb appwhistler
```

2. Initialize the schema and seed data:
```bash
psql -d appwhistler -f database/schema.sql
psql -d appwhistler -f database/seed.sql
```

#### Option B: SQLite (Development Only)

SQLite will be automatically initialized when you start the server. Just set `DATABASE_URL=./dev.db` in your `.env` file.

### 5. Start the Development Servers

#### Terminal 1: Backend Server
```bash
cd backend
npm run dev
```

The backend will start on `http://localhost:5000` with:
- GraphQL endpoint: `http://localhost:5000/graphql`
- GraphQL subscriptions: `ws://localhost:5000/graphql`
- REST API: `http://localhost:5000/api/v1`
- Health check: `http://localhost:5000/health`

#### Terminal 2: Frontend Dev Server
```bash
npm run dev
```

The frontend will start on `http://localhost:3000`

## Development

### Frontend Development

The frontend uses Vite for fast development:
- Hot module replacement (HMR) enabled
- Tailwind CSS for styling
- Apollo Client for GraphQL queries/mutations/subscriptions

### Backend Development

The backend uses nodemon for auto-restart:
- GraphQL API with Apollo Server
- Real-time subscriptions via WebSockets
- Background job processing with Bull
- JWT-based authentication

### Code Style

- Use ES6+ syntax for frontend
- Use CommonJS for backend (require/module.exports)
- Follow existing patterns in the codebase
- No component file splitting (intentional design choice)

## Building for Production

### Frontend Build
```bash
npm run build
```

This creates an optimized production build in the `dist/` directory.

### Backend Production
```bash
cd backend
npm start
```

For production deployment, consider:
- Using a process manager (PM2, systemd)
- Setting `NODE_ENV=production`
- Using PostgreSQL (not SQLite)
- Enabling Sentry for error tracking
- Setting up proper CORS origins

## Testing

Currently, there is no test infrastructure set up. To add tests:
1. Install Vitest: `npm install -D vitest`
2. Install React Testing Library: `npm install -D @testing-library/react`
3. Create test files: `*.test.jsx` or `*.spec.jsx`

## API Documentation

### GraphQL API

Access the GraphQL Playground in development:
- URL: `http://localhost:5000/graphql`

Key queries:
- `apps`: List all applications
- `app(id)`: Get single application
- `searchApps(query)`: Search applications

Key mutations:
- `createApp`: Create new application
- `updateApp`: Update application
- `deleteApp`: Delete application

Key subscriptions:
- `appUpdated`: Real-time app updates
- `factCheckComplete`: Fact-check completion notifications

### REST API

- `GET /health` - Health check
- `GET /api/v1/privacy` - Privacy policy
- `POST /api/v1/upload` - File upload endpoint

## Security Considerations

- JWT tokens are used for authentication
- Rate limiting is enabled on API endpoints
- GraphQL complexity limits prevent expensive queries
- File uploads are validated and sanitized
- CORS is configured for specific origins
- Environment variables store sensitive data

## Troubleshooting

### Database Connection Issues

If you see database connection errors:
1. Verify PostgreSQL is running: `pg_isready`
2. Check your `.env` credentials
3. Ensure the database exists: `psql -l`

### Port Already in Use

If port 3000 or 5000 is in use:
1. Kill the process: `lsof -ti:3000 | xargs kill -9`
2. Or change the port in `.env` (backend) or `vite.config.js` (frontend)

### Module Not Found

If you see "module not found" errors:
1. Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`
2. Do the same in the backend: `cd backend && rm -rf node_modules && npm install`

## Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make your changes
3. Test thoroughly
4. Commit with clear messages
5. Push and create a pull request

## License

[Add your license information here]

## Support

For issues and questions, please contact [add contact information].
