@echo off
title SAVOR - Stop Semua
echo Menghentikan SAVOR (backend + frontend + tunnel)...
for /f "tokens=5" %%p in ('netstat -ano ^| findstr :8000 ^| findstr LISTENING') do taskkill /PID %%p /F >nul 2>nul
for /f "tokens=5" %%p in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do taskkill /PID %%p /F >nul 2>nul
taskkill /IM cloudflared.exe /F >nul 2>nul
echo Selesai.
timeout /t 2 >nul
