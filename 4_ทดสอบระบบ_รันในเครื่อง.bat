@echo off
echo =========================================
echo       Starting PDPA Local Test Server
echo =========================================
echo.

echo Starting Backend Server (Port 3001)...
start cmd /k "npm run server"

echo.
echo Server is starting!
echo.
echo Please wait a few seconds, then open your browser and go to:
echo - Public Portal: http://localhost:3001/
echo - Super Admin: http://localhost:3001/super-admin
echo.
pause
