@echo off
REM AppWhistler Windows 11 Startup Script
REM This script starts both the backend and frontend servers

echo ===============================================
echo    AppWhistler Production - Windows 11
echo ===============================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo [OK] Node.js found:
node --version
echo.

REM Check if dependencies are installed
if not exist "node_modules\" (
    echo [WARNING] Frontend dependencies not found. Installing...
    call npm install
)

if not exist "backend\node_modules\" (
    echo [WARNING] Backend dependencies not found. Installing...
    cd backend
    call npm install
    cd ..
)

echo.
echo ===============================================
echo   Starting AppWhistler Servers...
echo ===============================================
echo.
echo [1/2] Starting Backend Server (Port 5000)...
echo [2/2] Starting Frontend Server (Port 3000)...
echo.
echo Press Ctrl+C in each window to stop the servers
echo.

REM Start backend in new window
start "AppWhistler Backend" cmd /k "cd /d %~dp0backend && npm start"

REM Wait 3 seconds for backend to initialize
timeout /t 3 /nobreak >nul

REM Start frontend in new window
start "AppWhistler Frontend" cmd /k "cd /d %~dp0 && npm run dev"

echo.
echo ===============================================
echo   AppWhistler Started Successfully!
echo ===============================================
echo.
echo Backend:  http://localhost:5000
echo Frontend: http://localhost:3000
echo GraphQL:  http://localhost:5000/graphql
echo.
echo Two new windows have been opened:
echo   - AppWhistler Backend (port 5000)
echo   - AppWhistler Frontend (port 3000)
echo.
echo Your default browser will open automatically.
echo If not, navigate to: http://localhost:3000
echo.

REM Wait 5 seconds for frontend to start, then open browser
timeout /t 5 /nobreak >nul
start http://localhost:3000

echo.
echo Press any key to exit this window...
echo (Servers will continue running in their windows)
pause >nul
