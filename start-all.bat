@echo off
REM Start all servers for the Speech Translation System
cd /d "%~dp0"
echo ========================================
echo   Speech Translation System Launcher
echo ========================================
echo.

REM Start Python API Server
echo [1/2] Starting Python API Server (port 8001)...
start "Python API Server" cmd /k "cd /d "%~dp0" && python python-api/app/main.py"
timeout /t 3 /nobreak >nul

REM Start Vite Dev Server
echo [2/2] Starting Frontend Dev Server (port 5173)...
start "Vite Frontend" cmd /k "cd /d "%~dp0" && npm run dev"

echo.
echo ========================================
echo   All servers started!
echo   API Docs:   http://localhost:8001/docs
echo   Frontend:   http://localhost:5173
echo ========================================
echo.
echo Close any terminal window to stop that server.
pause
