@echo off
REM Comprehensive Fix Script - Handles merge conflicts and starts AppWhistler
REM Run this on your Windows PC to fix everything automatically

echo ===============================================
echo   AppWhistler Auto-Fix and Start
echo ===============================================
echo.

REM Abort any pending merge
echo [1/6] Aborting any pending merge...
git merge --abort >nul 2>&1

REM Reset to clean state
echo [2/6] Resetting to clean state...
git reset --hard origin/claude/fix-db-frontend-loading-011HT69UgENvptdxrnPDQgoj

REM Pull latest code
echo [3/6] Pulling latest fixes...
git pull origin claude/fix-db-frontend-loading-011HT69UgENvptdxrnPDQgoj

REM Install dependencies if needed
echo [4/6] Checking dependencies...
if not exist "node_modules\" (
    echo Installing frontend dependencies...
    call npm install
)
if not exist "backend\node_modules\" (
    echo Installing backend dependencies...
    cd backend
    call npm install
    cd ..
)

REM Initialize database
echo [5/6] Initializing database...
cd database
node init.cjs >nul 2>&1
cd ..

echo [6/6] Starting servers...
echo.
echo ===============================================
echo   Starting AppWhistler...
echo ===============================================
echo.

REM Start backend
start "AppWhistler Backend" cmd /k "cd /d %~dp0backend && npm start"
timeout /t 5 /nobreak >nul

REM Start frontend
start "AppWhistler Frontend" cmd /k "cd /d %~dp0 && npm run dev"
timeout /t 5 /nobreak >nul

REM Open browser
start http://localhost:3000

echo.
echo ===============================================
echo   DONE!
echo ===============================================
echo.
echo Backend:  http://localhost:5000
echo Frontend: http://localhost:3000
echo.
echo Two windows opened for backend and frontend.
echo Browser should open automatically.
echo.
pause
