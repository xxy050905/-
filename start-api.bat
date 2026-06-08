@echo off
REM Start Python API Server for Speech Translation System
cd /d "%~dp0"
echo ========================================
echo   Speech Translation API Server
echo ========================================
echo.
echo Starting on port 8001...
echo API Docs: http://localhost:8001/docs
echo.
python python-api/app/main.py
pause
