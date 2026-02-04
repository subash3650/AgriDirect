@echo off
echo ===================================
echo    AgriDirect Startup Script
echo ===================================
echo.

REM Kill any existing node processes to free ports
echo Killing any existing Node.js processes...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul

echo.
echo Starting Services...
echo.

REM Start Backend Server (Port 5000)
echo Starting Backend Server (Port 5000)...
start "AgriDirect Backend" cmd /k "cd /d a:\AgriDirect\server && npm run dev"

REM Start Frontend (Port 5173)
echo Starting Frontend (Port 5173)...
start "AgriDirect Frontend" cmd /k "cd /d a:\AgriDirect\client && npm run dev"

echo.
echo ===================================
echo    All services started!
echo ===================================
echo.
echo Backend: http://localhost:5000
echo Frontend: http://localhost:5173
echo.
pause
