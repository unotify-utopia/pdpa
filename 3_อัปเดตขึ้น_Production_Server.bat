@echo off
chcp 65001 >nul
title [PDPA App] อัปเดตระบบขึ้น Production Server
cls
echo ========================================================
echo         กำลังอัปเดตระบบขึ้น Production Server...
echo ========================================================
node deploy_server.cjs
echo.
pause
