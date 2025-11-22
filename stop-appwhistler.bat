@echo off
REM AppWhistler Windows 11 Stop Script
REM This script stops both the backend and frontend servers

echo ===============================================
echo    Stopping AppWhistler Servers...
echo ===============================================
echo.

REM Kill Node.js processes on port 5000 (backend)
echo [1/2] Stopping Backend Server (Port 5000)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5000" ^| findstr "LISTENING"') do (
    echo Killing process %%a...
    taskkill /PID %%a /F >nul 2>nul
)
echo [OK] Backend stopped
echo.

REM Kill Node.js processes on port 3000 (frontend)
echo [2/2] Stopping Frontend Server (Port 3000)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000" ^| findstr "LISTENING"') do (
    echo Killing process %%a...
    taskkill /PID %%a /F >nul 2>nul
)
echo [OK] Frontend stopped
echo.

echo ===============================================
echo   All AppWhistler servers stopped!
echo ===============================================
echo.

pause
