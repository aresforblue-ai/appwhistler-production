# AppWhistler - Windows 11 Deployment Guide

**Complete Step-by-Step Instructions for Deploying on Windows 11**

Last Updated: 2025-11-22
Platform: Windows 11
Status: Production-Ready ✅

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start (5 Minutes)](#quick-start-5-minutes)
3. [Detailed Installation](#detailed-installation)
4. [Verification & Testing](#verification--testing)
5. [Troubleshooting](#troubleshooting)
6. [Advanced Configuration](#advanced-configuration)

---

## Prerequisites

### Required Software

| Software | Minimum Version | Download Link | Purpose |
|----------|----------------|---------------|---------|
| **Node.js** | v16.x or higher | [nodejs.org](https://nodejs.org/) | JavaScript runtime |
| **npm** | v8.x or higher | Included with Node.js | Package manager |
| **Git** | v2.x or higher | [git-scm.com](https://git-scm.com/) | Version control |

### Optional Software (Recommended)

| Software | Purpose | Download Link |
|----------|---------|---------------|
| **PostgreSQL** | Production database | [postgresql.org](https://www.postgresql.org/download/windows/) |
| **Windows Terminal** | Better terminal experience | Microsoft Store |
| **VS Code** | Code editor | [code.visualstudio.com](https://code.visualstudio.com/) |

### System Requirements

- **OS**: Windows 11 (build 22000 or later)
- **RAM**: 4GB minimum, 8GB recommended
- **Disk Space**: 500MB for application + dependencies
- **Network**: Internet connection for initial setup

---

## Quick Start (5 Minutes)

**If you already have Node.js installed and just want to run the application:**

### Step 1: Open PowerShell or Command Prompt

```powershell
# Navigate to the project directory
cd C:\appwhistler-production
```

### Step 2: Run the Startup Script

```powershell
start-appwhistler.bat
```

**That's it!** The script will:
- ✅ Check dependencies
- ✅ Install missing packages automatically
- ✅ Start backend server (port 5000)
- ✅ Start frontend server (port 3000)
- ✅ Open your browser to http://localhost:3000

### Step 3: Verify Everything Works

```powershell
check-services.bat
```

---

## Detailed Installation

**For first-time setup or if Quick Start didn't work:**

### Phase 1: Install Node.js

1. **Download Node.js**
   - Visit: https://nodejs.org/
   - Download: **LTS version** (Long Term Support)
   - File: `node-v18.x.x-x64.msi` (or latest LTS)

2. **Run the Installer**
   - Double-click the downloaded `.msi` file
   - Click "Next" through the wizard
   - ✅ Check "Automatically install the necessary tools" (includes npm)
   - Click "Install"
   - Click "Finish"

3. **Verify Installation**
   ```powershell
   # Open a NEW PowerShell window (important!)
   node --version
   # Should show: v18.x.x or higher

   npm --version
   # Should show: 8.x.x or higher
   ```

   ⚠️ **If commands not found**: Restart your computer and try again.

### Phase 2: Clone or Extract the Project

**If using Git:**
```powershell
cd C:\
git clone https://github.com/your-repo/appwhistler-production.git
cd appwhistler-production
```

**If using a ZIP file:**
1. Extract `appwhistler-production.zip` to `C:\appwhistler-production`
2. Open PowerShell and navigate:
   ```powershell
   cd C:\appwhistler-production
   ```

### Phase 3: Install Dependencies

#### Option A: Automatic (Recommended)

```powershell
# The startup script will install dependencies automatically
start-appwhistler.bat
```

#### Option B: Manual Installation

```powershell
# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..
```

**Expected output:**
```
added 350 packages (frontend)
added 718 packages (backend)
```

This may take 2-5 minutes depending on your internet speed.

### Phase 4: Initialize Database

The database is **automatically initialized** on first run, but you can do it manually:

```powershell
cd database
node init.cjs
```

**Expected output:**
```
🔧 Initializing database...
⚠️  PostgreSQL not available: (error message)
🔄 Falling back to SQLite...
✅ SQLite connected
🔄 Running sqlite migrations...
✅ Schema created
📊 Seeding database...
✅ Database seeded with demo data
✅ Database initialization complete!
```

**Verify database created:**
```powershell
dir database\appwhistler.db
# Should show a file ~132 KB in size
```

### Phase 5: Configure Environment Variables

The project comes with a pre-configured `.env` file. **No changes needed for local development**.

**Optional: Review the configuration:**
```powershell
notepad .env
```

**Key settings** (already configured):
```env
NODE_ENV=development
PORT=5000
DB_HOST=localhost
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5000
```

### Phase 6: Start the Servers

#### Option A: Using the Startup Script (Recommended)

```powershell
start-appwhistler.bat
```

This opens two new windows:
1. **Backend Server** - Runs on port 5000
2. **Frontend Server** - Runs on port 3000

Your browser will automatically open to `http://localhost:3000`.

#### Option B: Manual Start (for debugging)

**Terminal 1 - Backend:**
```powershell
cd C:\appwhistler-production\backend
npm start
```

**Wait for this output:**
```
✅ Environment validation passed
✅ Database connected at: 2025-11-22T...
✅ Background job queues initialized
🔄 Starting Apollo Server...
✅ Apollo Server started
🚀 AppWhistler Server Ready!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 REST API:    http://localhost:5000/api/v1
📍 GraphQL:     http://localhost:5000/graphql
📍 WebSockets:  ws://localhost:5000
📍 Health:      http://localhost:5000/health
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Terminal 2 - Frontend:**
```powershell
cd C:\appwhistler-production
npm run dev
```

**Wait for this output:**
```
VITE v6.4.1  ready in 450 ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```

---

## Verification & Testing

### Automated Health Check

```powershell
check-services.bat
```

**Expected output:**
```
[1/7] Checking Node.js installation...
[OK] Node.js is installed
v18.x.x

[2/7] Checking npm installation...
[OK] npm is installed
8.x.x

[3/7] Checking frontend dependencies...
[OK] Frontend dependencies installed

[4/7] Checking backend dependencies...
[OK] Backend dependencies installed

[5/7] Checking database...
[OK] SQLite database exists
Size: 135168 bytes

[6/7] Checking backend server (port 5000)...
[OK] Backend server is RUNNING
URL: http://localhost:5000

[7/7] Checking frontend server (port 3000)...
[OK] Frontend server is RUNNING
URL: http://localhost:3000

===============================================
  Health Check Summary
===============================================
[SUCCESS] All services are running correctly!
```

### Manual Testing

**Test 1: Backend Health Check**
```powershell
curl http://localhost:5000/health
```
Expected: `{"status":"healthy"}`

**Test 2: GraphQL Endpoint**
```powershell
curl http://localhost:5000/graphql
```
Expected: HTML page (GraphQL Playground)

**Test 3: Frontend Loads**
- Open browser: http://localhost:3000
- You should see the AppWhistler interface
- Apps should load from the database (not mock data)

**Test 4: Database Query**
Open browser: http://localhost:5000/graphql
Run this query:
```graphql
query {
  trendingApps(limit: 5) {
    id
    name
    truthRating
    category
  }
}
```

Expected: JSON response with 5 apps from the database.

### Stopping the Servers

**Option A: Using the Stop Script**
```powershell
stop-appwhistler.bat
```

**Option B: Manual Stop**
- In each server window, press `Ctrl + C`
- Confirm with `Y` when prompted

---

## Troubleshooting

### Problem 1: "Node is not recognized as an internal or external command"

**Cause**: Node.js not installed or not in PATH

**Solution**:
1. Reinstall Node.js from https://nodejs.org/
2. During installation, ensure "Add to PATH" is checked
3. Restart PowerShell (or restart computer)
4. Try again: `node --version`

---

### Problem 2: Port 5000 or 3000 Already in Use

**Cause**: Another application is using these ports

**Solution**:
```powershell
# Check what's using port 5000
netstat -ano | findstr :5000

# Kill the process (replace PID with the number from above)
taskkill /PID <PID> /F

# Same for port 3000
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

**Alternative**: Change ports in `.env`:
```env
PORT=5001  # Change from 5000 to 5001
```

---

### Problem 3: White Screen on Frontend

**Cause**: Backend not running or database not initialized

**Solution**:
```powershell
# Step 1: Check backend is running
curl http://localhost:5000/health

# If backend not running, start it:
cd backend
npm start

# Step 2: Check database exists
dir database\appwhistler.db

# If database missing, initialize it:
cd database
node init.cjs
```

---

### Problem 4: "Cannot find module 'pg'" or "Cannot find module 'vite'"

**Cause**: Dependencies not installed

**Solution**:
```powershell
# Reinstall all dependencies
npm install
cd backend
npm install
cd ..
```

---

### Problem 5: Frontend Shows Connection Error

**Symptoms**:
- Frontend loads but shows "⚠️ Connection Error"
- Error message: "Unable to connect to AppWhistler backend"

**Cause**: Backend server not running

**Solution**:
```powershell
# Start backend server
cd backend
npm start
```

Wait for `✅ Database connected` message, then refresh frontend.

---

### Problem 6: Database Connection Failed

**Error**: `❌ Database connection failed`

**Solution 1: Use SQLite (Automatic Fallback)**
```powershell
cd database
node init.cjs
# Will automatically create SQLite database
```

**Solution 2: Install PostgreSQL (Optional)**
1. Download PostgreSQL from https://www.postgresql.org/download/windows/
2. Install with default settings
3. Remember the password you set for the `postgres` user
4. Update `.env`:
   ```env
   DB_PASSWORD=your_postgres_password
   ```
5. Create database:
   ```powershell
   psql -U postgres -c "CREATE DATABASE appwhistler;"
   ```

---

### Problem 7: "Access Denied" or Permission Errors

**Cause**: Windows User Account Control (UAC) or antivirus blocking

**Solution**:
1. Run PowerShell as Administrator (right-click → "Run as administrator")
2. Add exception in Windows Defender:
   - Open Windows Security
   - Virus & threat protection → Manage settings
   - Exclusions → Add exclusion
   - Add folder: `C:\appwhistler-production`

---

### Problem 8: npm install Fails with EACCES or EPERM

**Cause**: Permission issues or antivirus

**Solution**:
```powershell
# Clear npm cache
npm cache clean --force

# Try install again
npm install
```

**If still failing**:
1. Disable antivirus temporarily
2. Run PowerShell as Administrator
3. Try install again

---

## Advanced Configuration

### Running on Different Ports

**Backend (default: 5000):**
Edit `.env`:
```env
PORT=5001
```

**Frontend (default: 3000):**
Edit `package.json` (scripts section):
```json
"dev": "vite --port 3001"
```

**Update CORS** in `.env`:
```env
ALLOWED_ORIGINS=http://localhost:3001,http://localhost:5001
```

### Using PostgreSQL Instead of SQLite

1. Install PostgreSQL (see Problem 6 above)
2. Create database:
   ```powershell
   psql -U postgres -c "CREATE DATABASE appwhistler;"
   ```
3. Update `.env` with your PostgreSQL password
4. Restart backend server

### Enabling Production Mode

**⚠️ Not recommended for local development**

Edit `.env`:
```env
NODE_ENV=production
```

Additional requirements:
- Strong JWT secrets (already configured)
- HTTPS certificate
- Proper database backups
- Error monitoring (Sentry DSN)

### Firewall Configuration

If you want to access AppWhistler from other devices on your network:

1. Open Windows Firewall Settings
2. Advanced settings → Inbound Rules
3. New Rule → Port
4. TCP ports: 3000, 5000
5. Allow the connection
6. Apply to all profiles

Then get your local IP:
```powershell
ipconfig
# Look for "IPv4 Address"
```

Access from other devices: `http://YOUR_IP:3000`

---

## Daily Usage

### Starting AppWhistler

```powershell
cd C:\appwhistler-production
start-appwhistler.bat
```

### Stopping AppWhistler

```powershell
stop-appwhistler.bat
```

### Checking Status

```powershell
check-services.bat
```

### Viewing Logs

**Backend logs**: Check the "AppWhistler Backend" window
**Frontend logs**: Check the "AppWhistler Frontend" window

---

## Performance Tips

1. **Close unnecessary applications** before starting AppWhistler
2. **Use SSD** if possible (faster database operations)
3. **Exclude from antivirus scans**: Add `C:\appwhistler-production\node_modules` to exclusions
4. **Use Windows Terminal** instead of Command Prompt (better performance)
5. **Update Node.js** to latest LTS version periodically

---

## Updating AppWhistler

```powershell
# If using Git
cd C:\appwhistler-production
git pull origin main

# Reinstall dependencies (in case they changed)
npm install
cd backend
npm install
cd ..

# Restart servers
stop-appwhistler.bat
start-appwhistler.bat
```

---

## Uninstalling

1. **Stop all servers**:
   ```powershell
   stop-appwhistler.bat
   ```

2. **Delete project folder**:
   ```powershell
   cd C:\
   rmdir /s /q appwhistler-production
   ```

3. **Optional**: Uninstall Node.js via Windows Settings → Apps

---

## Getting Help

### Debug Checklist

Before asking for help, try these steps:

1. ✅ Run `check-services.bat` and review output
2. ✅ Check both server windows for error messages
3. ✅ Try restarting with `stop-appwhistler.bat` then `start-appwhistler.bat`
4. ✅ Verify `.env` file exists and has correct values
5. ✅ Check `database\appwhistler.db` exists
6. ✅ Ensure no other applications are using ports 3000 or 5000

### Log Files

No log files by default. To capture logs:

```powershell
# Backend logs to file
cd backend
npm start > backend.log 2>&1

# Frontend logs to file
npm run dev > frontend.log 2>&1
```

### Support Resources

- **Documentation**: `/CLAUDE.md` (comprehensive development guide)
- **Quick Fixes**: `/docs/WINDOWS_DEPLOYMENT_QUICK_FIX_GUIDE.md`
- **Issue Tracker**: GitHub Issues (if repository is public)

---

## Appendix: Command Reference

### Useful PowerShell Commands

```powershell
# Check if servers are running
netstat -ano | findstr :3000
netstat -ano | findstr :5000

# View Node.js processes
tasklist | findstr node

# Test backend connectivity
curl http://localhost:5000/health

# Check database size
dir database\appwhistler.db

# View environment variables
type .env

# Find Node.js installation path
where node
```

### Useful npm Commands

```powershell
# Check for outdated packages
npm outdated

# Update all packages
npm update

# Clear cache
npm cache clean --force

# Reinstall everything
rmdir /s /q node_modules
npm install
```

---

## FAQ

**Q: Do I need PostgreSQL?**
A: No. The application automatically falls back to SQLite if PostgreSQL is not available.

**Q: Can I use a different port?**
A: Yes. Edit `.env` to change PORT, and update ALLOWED_ORIGINS accordingly.

**Q: How much disk space do I need?**
A: Approximately 500MB (400MB for node_modules, 100MB for the application).

**Q: Can I run this on Windows 10?**
A: Yes. These instructions work on Windows 10 build 19041 or later.

**Q: How do I update to a newer version?**
A: If using Git: `git pull`. Otherwise, download the new version and copy your `.env` file.

**Q: Is this production-ready?**
A: For local development: Yes. For public internet deployment: Additional security configuration required (HTTPS, strong secrets, firewall).

---

## Changelog

**2025-11-22** - Initial Windows 11 deployment guide
- Complete installation instructions
- Automated startup scripts
- Comprehensive troubleshooting section
- Health check validation script

---

**🎉 Congratulations! You've successfully deployed AppWhistler on Windows 11.**

For questions or issues, refer to the troubleshooting section or check `/CLAUDE.md` for developer documentation.
