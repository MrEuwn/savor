@echo off
title MejaAR - Local Runner
cd /d "%~dp0"

echo ============================================
echo   MejaAR - Menjalankan semua layanan
echo ============================================

REM ---- Cek dependensi ringan ----
where uv >nul 2>nul || (echo [ERROR] uv belum terinstal. Install: https://docs.astral.sh/uv/ & pause & exit /b 1)
where node >nul 2>nul || (echo [ERROR] Node.js belum terinstal. & pause & exit /b 1)

REM ---- Seed data demo saat pertama kali (DB belum ada) ----
if not exist "backend\mejaar.db" (
  echo [1/4] Seed data demo pertama kali...
  cd backend && uv run python seed_demo.py --api http://localhost:8000 2>nul
  cd ..
)

REM ---- Matikan sisa proses lama di port yang sama ----
echo [2/4] Bersihkan port 8000/3000...
for /f "tokens=5" %%p in ('netstat -ano ^| findstr :8000 ^| findstr LISTENING') do taskkill /PID %%p /F >nul 2>nul
for /f "tokens=5" %%p in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do taskkill /PID %%p /F >nul 2>nul

REM ---- jalankan backend ----
echo [3/4] Backend FastAPI di :8000 ...
start "MejaAR API" /min cmd /c "cd backend && uv run uvicorn app.main:app --port 8000"

REM ---- jalankan frontend ----
echo [4/4] Frontend Next.js di :3000 ...
start "MejaAR Web" /min cmd /c "cd frontend && npx next dev -p 3000"

REM ---- tunggu keduanya siap, lalu buka browser ----
echo Menunggu layanan siap...
:wait1
timeout /t 2 /nobreak >nul
curl -s -o nul -w "%%{http_code}" http://localhost:8000/healthz | findstr 200 >nul || goto wait1
:wait2
timeout /t 2 /nobreak >nul
curl -s -o nul -w "%%{http_code}" http://localhost:3000/login | findstr 200 >nul || goto wait2

echo.
echo ============================================
echo   Semua layanan SIAP
echo   Dashboard : http://localhost:3000/login
echo   Menu      : http://localhost:3000/public/meja-aresto?table=T-01
echo   API docs  : http://localhost:8000/docs
echo   Login     : demo@mejaar.id / MejaAR-2026!
echo ============================================
echo.
echo Klik-kanan file ini lalu matikan dengan:
echo   taskkill /IM cmd.exe  (atau tutup 2 window minimized)
echo.
start http://localhost:3000/login
pause
