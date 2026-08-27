@echo off
chcp 65001 >nul
title [PDPA App] อัปเดตฐานข้อมูล (Cookie Consent)
cls
echo ========================================================
echo         กำลังอัปเดตฐานข้อมูลสำหรับระบบคุกกี้...
echo ========================================================
node migrate_cookie_db.cjs
echo.
pause
