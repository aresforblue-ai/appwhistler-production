@echo off
REM AppWhistler Service Health Check Script
REM Validates all services are running correctly

echo ===============================================
echo    AppWhistler Service Health Check
echo ===============================================
echo.

set ERRORS=0

REM Check Node.js
echo [1/7] Checking Node.js installation...
where node >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] Node.js is installed
    node --version
) else (
    echo [FAIL] Node.js is NOT installed
    set /a ERRORS+=1
)
echo.

REM Check npm
echo [2/7] Checking npm installation...
where npm >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] npm is installed
    npm --version
) else (
    echo [FAIL] npm is NOT installed
    set /a ERRORS+=1
)
echo.

REM Check frontend dependencies
echo [3/7] Checking frontend dependencies...
if exist "node_modules\" (
    echo [OK] Frontend dependencies installed
) else (
    echo [FAIL] Frontend dependencies NOT installed
    echo Run: npm install
    set /a ERRORS+=1
)
echo.

REM Check backend dependencies
echo [4/7] Checking backend dependencies...
if exist "backend\node_modules\" (
    echo [OK] Backend dependencies installed
) else (
    echo [FAIL] Backend dependencies NOT installed
    echo Run: cd backend ^&^& npm install
    set /a ERRORS+=1
)
echo.

REM Check database
echo [5/7] Checking database...
if exist "database\appwhistler.db" (
    echo [OK] SQLite database exists
    for %%A in ("database\appwhistler.db") do echo Size: %%~zA bytes
) else (
    echo [FAIL] Database file NOT found
    echo Run: cd database ^&^& node init.cjs
    set /a ERRORS+=1
)
echo.

REM Check backend server (port 5000)
echo [6/7] Checking backend server (port 5000)...
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:5000/health' -UseBasicParsing -TimeoutSec 2; if ($response.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] Backend server is RUNNING
    echo URL: http://localhost:5000
) else (
    echo [FAIL] Backend server is NOT running
    echo Run: cd backend ^&^& npm start
    set /a ERRORS+=1
)
echo.

REM Check frontend server (port 3000)
echo [7/7] Checking frontend server (port 3000)...
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:3000' -UseBasicParsing -TimeoutSec 2; if ($response.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] Frontend server is RUNNING
    echo URL: http://localhost:3000
) else (
    echo [FAIL] Frontend server is NOT running
    echo Run: npm run dev
    set /a ERRORS+=1
)
echo.

REM Summary
echo ===============================================
echo   Health Check Summary
echo ===============================================
if %ERRORS% EQU 0 (
    echo [SUCCESS] All services are running correctly!
    echo.
    echo You can access AppWhistler at:
    echo   Frontend: http://localhost:3000
    echo   Backend:  http://localhost:5000
    echo   GraphQL:  http://localhost:5000/graphql
) else (
    echo [WARNING] %ERRORS% issue(s) detected!
    echo Please review the errors above and fix them.
)
echo.

pause
