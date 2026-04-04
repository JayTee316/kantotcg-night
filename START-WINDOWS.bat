@echo off
title Kanto TCG - Local Server
echo =============================================
echo   FireRed / LeafGreen TCG - Local Server
echo =============================================
python --version >nul 2>&1
if %errorlevel%==0 ( start "" http://localhost:8080 & python -m http.server 8080 & goto end )
python3 --version >nul 2>&1
if %errorlevel%==0 ( start "" http://localhost:8080 & python3 -m http.server 8080 & goto end )
npx --version >nul 2>&1
if %errorlevel%==0 ( start "" http://localhost:3000 & npx serve . -l 3000 & goto end )
echo Python or Node.js required. Get Python at https://www.python.org/downloads/
pause
:end
