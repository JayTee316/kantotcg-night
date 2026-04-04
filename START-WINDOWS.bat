@echo off
title KANTO TCG - Local Server
echo ========================================
echo   KANTO TCG - Starting local server
echo ========================================
echo.
python --version >nul 2>&1
if %errorlevel% == 0 (
    echo Starting with Python...
    echo Open: http://localhost:8080
    start "" http://localhost:8080
    python -m http.server 8080
    goto end
)
python3 --version >nul 2>&1
if %errorlevel% == 0 (
    echo Starting with Python3...
    echo Open: http://localhost:8080
    start "" http://localhost:8080
    python3 -m http.server 8080
    goto end
)
npx --version >nul 2>&1
if %errorlevel% == 0 (
    echo Starting with Node.js...
    echo Open: http://localhost:3000
    start "" http://localhost:3000
    npx serve . -l 3000
    goto end
)
echo ERROR: Python or Node.js required.
echo Install from https://www.python.org/downloads/
pause
:end
