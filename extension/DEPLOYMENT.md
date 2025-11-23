# AppWhistler Backend Deployment Guide

This guide covers deploying the AppWhistler GraphQL API to production so the Chrome extension can access it.

## Prerequisites

- GitHub account with push access to the repository
- Fly.io or Render.com account (both have free tiers)
- PostgreSQL database (can use provider's managed DB)

---

## Option 1: Deploy to Fly.io (Recommended)

Fly.io offers:
- ✅ Free tier (256MB RAM, 1 shared CPU)
- ✅ Global edge deployment
- ✅ Auto HTTPS
- ✅ Built-in PostgreSQL

### Step 1: Install Fly CLI

```bash
# macOS/Linux
curl -L https://fly.io/install.sh | sh

# Windows (PowerShell)
iwr https://fly.io/install.ps1 -useb | iex
```

### Step 2: Login to Fly

```bash
flyctl auth login
```

### Step 3: Initialize Fly App

```bash
cd /home/user/appwhistler-production/backend

# Create fly.toml config
flyctl launch --no-deploy

# When prompted:
# - App name: appwhistler-api (or your choice)
# - Region: Choose closest to your users
# - PostgreSQL: Yes (creates managed DB)
```

### Step 4: Set Environment Variables

```bash
# Set all required secrets
flyctl secrets set \
  JWT_SECRET="your_strong_jwt_secret_change_this" \
  REFRESH_TOKEN_SECRET="your_refresh_secret_change_this" \
  NODE_ENV="production" \
  ALLOWED_ORIGINS="https://twitter.com,https://x.com,https://appwhistler.org"

# Optional: Add external service keys
flyctl secrets set \
  SENDGRID_API_KEY="your_sendgrid_key" \
  HUGGINGFACE_API_KEY="your_hf_key" \
  SENTRY_DSN="your_sentry_dsn"
```

### Step 5: Update fly.toml

Edit `fly.toml` and ensure it has:

```toml
app = "appwhistler-api"

[build]
  builder = "heroku/buildpacks:20"

[env]
  PORT = "8080"
  NODE_ENV = "production"

[[services]]
  http_checks = []
  internal_port = 8080
  processes = ["app"]
  protocol = "tcp"
  script_checks = []

  [services.concurrency]
    hard_limit = 25
    soft_limit = 20
    type = "connections"

  [[services.ports]]
    force_https = true
    handlers = ["http"]
    port = 80

  [[services.ports]]
    handlers = ["tls", "http"]
    port = 443

  [[services.tcp_checks]]
    grace_period = "1s"
    interval = "15s"
    restart_limit = 0
    timeout = "2s"

  [[services.http_checks]]
    interval = 10000
    grace_period = "5s"
    method = "get"
    path = "/health"
    protocol = "http"
    timeout = 2000
    tls_skip_verify = false
```

### Step 6: Deploy

```bash
flyctl deploy

# Your API will be available at:
# https://appwhistler-api.fly.dev/graphql
```

### Step 7: Initialize Database

```bash
# Connect to your Fly PostgreSQL database
flyctl postgres connect -a appwhistler-api-db

# Run schema initialization
\i /path/to/database/schema.sql

# Exit
\q
```

### Step 8: Update Extension API URL

Update `extension/shared/api.js`:

```javascript
const API_URL = 'https://appwhistler-api.fly.dev/graphql';
```

---

## Option 2: Deploy to Render.com

Render offers:
- ✅ Free tier (512MB RAM)
- ✅ Auto deploy from GitHub
- ✅ Auto HTTPS
- ✅ Managed PostgreSQL ($7/month, no free tier)

### Step 1: Create Render Account

1. Go to https://render.com
2. Sign up with GitHub
3. Authorize Render to access your repository

### Step 2: Create PostgreSQL Database (Optional)

1. Click "New +" → "PostgreSQL"
2. Name: `appwhistler-db`
3. Plan: Free (dev only) or Starter ($7/mo for production)
4. Create Database
5. Copy the "Internal Database URL"

### Step 3: Create Web Service

1. Click "New +" → "Web Service"
2. Connect your GitHub repository
3. Configure:
   - **Name**: `appwhistler-api`
   - **Environment**: `Node`
   - **Build Command**: `cd backend && npm install`
   - **Start Command**: `cd backend && npm start`
   - **Plan**: Free

### Step 4: Add Environment Variables

In the Render dashboard, add:

```
NODE_ENV=production
PORT=10000
JWT_SECRET=your_strong_jwt_secret_change_this
REFRESH_TOKEN_SECRET=your_refresh_secret_change_this
ALLOWED_ORIGINS=https://twitter.com,https://x.com,https://appwhistler.org
DATABASE_URL=<your-render-postgres-url-from-step-2>

# Optional
SENDGRID_API_KEY=your_sendgrid_key
HUGGINGFACE_API_KEY=your_hf_key
SENTRY_DSN=your_sentry_dsn
```

### Step 5: Deploy

Render will automatically deploy when you push to GitHub.

Your API will be available at:
```
https://appwhistler-api.onrender.com/graphql
```

### Step 6: Initialize Database

```bash
# Connect to Render PostgreSQL
psql <your-render-postgres-url>

# Run schema
\i database/schema.sql

# Exit
\q
```

### Step 7: Update Extension API URL

Update `extension/shared/api.js`:

```javascript
const API_URL = 'https://appwhistler-api.onrender.com/graphql';
```

---

## Option 3: Deploy to Railway.app

Railway offers:
- ✅ Free tier ($5 credit/month)
- ✅ One-click PostgreSQL
- ✅ Auto deploy from GitHub
- ✅ Built-in metrics

### Quick Deploy

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
cd backend
railway init

# Link to GitHub repo (optional)
railway link

# Add PostgreSQL
railway add

# Deploy
railway up

# Your API URL will be provided
```

---

## Verifying Deployment

Test your deployed API:

```bash
# Health check
curl https://your-api-url.com/health

# GraphQL query
curl https://your-api-url.com/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query { analyzeUrl(url: \"https://twitter.com\") { appName truthScore letterGrade } }"
  }'
```

Expected response:
```json
{
  "data": {
    "analyzeUrl": {
      "appName": "Twitter",
      "truthScore": 75,
      "letterGrade": "C+"
    }
  }
}
```

---

## CORS Configuration

Ensure your backend allows requests from the extension:

In `backend/server.js`, verify:

```javascript
const allowedOrigins = [
  'https://twitter.com',
  'https://x.com',
  'chrome-extension://*', // Important for extension!
  process.env.FRONTEND_URL
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.some(allowed => {
      return allowed === '*' || origin === allowed || origin.startsWith(allowed.replace('*', ''));
    })) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
```

---

## SSL/HTTPS

All deployment platforms provide free SSL certificates. Ensure:

1. ✅ API is accessible via HTTPS
2. ✅ Extension manifest uses `https://` in `host_permissions`
3. ✅ No mixed content (HTTP resources on HTTPS pages)

---

## Monitoring

### Uptime Monitoring

Use a free service like:
- UptimeRobot: https://uptimerobot.com
- Better Uptime: https://betteruptime.com

Monitor your `/health` endpoint.

### Error Tracking

If using Sentry:

```bash
# Add Sentry DSN to environment
flyctl secrets set SENTRY_DSN="your_sentry_dsn"
```

### Performance Monitoring

All platforms provide basic metrics:
- **Fly.io**: `flyctl dashboard`
- **Render**: Dashboard → Metrics tab
- **Railway**: Dashboard → Observability

---

## Database Migrations

When updating the schema:

```bash
# Fly.io
flyctl postgres connect -a appwhistler-api-db
\i /path/to/new-migration.sql

# Render
psql <render-postgres-url> < new-migration.sql

# Railway
railway run psql < new-migration.sql
```

---

## Troubleshooting

### API Returns 500 Error

1. Check logs:
   ```bash
   flyctl logs           # Fly.io
   # or check Render/Railway dashboard
   ```

2. Verify environment variables are set
3. Check database connection

### Extension Can't Connect

1. Verify CORS is configured correctly
2. Check API URL in `extension/shared/api.js`
3. Open browser DevTools → Network tab → Check for CORS errors

### Database Connection Issues

1. Verify `DATABASE_URL` is set
2. Check connection pool settings in `backend/server.js`
3. Ensure database is running

---

## Next Steps

After deployment:

1. ✅ Test extension with production API
2. ✅ Submit extension to Chrome Web Store
3. ✅ Setup monitoring and alerts
4. ✅ Configure backup strategy for database
5. ✅ Setup CI/CD for automated deployments

---

## Cost Estimates

| Platform | Free Tier | Paid Plans Start At |
|----------|-----------|---------------------|
| Fly.io | 256MB RAM, 1 CPU | $1.94/month |
| Render | 512MB RAM | $7/month + $7/mo DB |
| Railway | $5 credit/month | $5/month usage-based |

**Recommended for MVP**: Start with Fly.io free tier, upgrade when you reach 1,000+ active users.

---

## Support

- Fly.io Docs: https://fly.io/docs
- Render Docs: https://render.com/docs
- Railway Docs: https://docs.railway.app

Need help? Open an issue on the repository.
