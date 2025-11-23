# Run AppWhistler Locally on Windows PC

## Quick Setup (5 minutes)

### Step 1: Install Prerequisites
1. **Install Node.js**: https://nodejs.org/en/download/prebuilt-installer
   - Download "Windows Installer (.msi)" - 64-bit
   - Run installer, accept defaults, click "Next" until done
   - This also installs npm

2. **Verify installation**:
   - Open Command Prompt (Win + R, type `cmd`, press Enter)
   - Type: `node --version` (should show v18 or higher)
   - Type: `npm --version` (should show v8 or higher)

### Step 2: Get the Code
Open Command Prompt and run:
```cmd
cd C:\
git clone https://github.com/aresforblue-ai/appwhistler-production.git
cd appwhistler-production
```

**OR** if you don't have git:
1. Download: https://github.com/aresforblue-ai/appwhistler-production/archive/refs/heads/claude/debug-white-screen-01MYdiPhWKbQrzbmmLEWsp4X.zip
2. Extract to `C:\appwhistler-production\`
3. Open Command Prompt: `cd C:\appwhistler-production`

### Step 3: Install Dependencies
```cmd
npm install
```
Wait 1-2 minutes while packages download.

### Step 4: Start the App
```cmd
npm run dev
```

You'll see:
```
VITE v6.4.1  ready in 375 ms
➜  Local:   http://localhost:3000/
```

### Step 5: Open in Browser
- Open Chrome/Edge
- Go to: **http://localhost:3000/**
- You should see AppWhistler!

---

## Troubleshooting

**Port 3000 already in use?**
```cmd
netstat -ano | findstr :3000
taskkill /F /PID <PID_NUMBER>
```

**Can't install packages?**
- Check internet connection
- Try: `npm install --verbose`

**White screen?**
- Open DevTools (F12)
- Check Console tab for errors
- Make sure you're at `http://localhost:3000/` not `https://`
