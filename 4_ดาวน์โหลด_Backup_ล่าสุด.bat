@echo off
chcp 65001 > nul
title PDPA Backup Sync
echo ==================================================
echo             PDPA Backup Auto Sync
echo ==================================================
echo.
echo à¸à¸³à¸¥à¸±à¸‡à¹€à¸Šà¸·à¹ˆà¸­à¸¡à¸•à¹ˆà¸­ Cloudflare R2...
cd /d "d:\PDPA req"
node scripts\sync_backups.cjs "D:\PDPA_Backups"
echo.
pause

