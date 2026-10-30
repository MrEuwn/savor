@echo off
setlocal EnableDelayedExpansion
title MejaAR - One Click Runner
cd /d "%~dp0"
color 0A

echo ================================================
echo    MejaAR - Jalankan Otomatis (kaya docker up)
echo ================================================
echo.

REM ============================================================
REM 0. Deteksi package manager (winget) sekali di awal
REM ============================================================
set "HAVE_WINGET=0"
where winget >nul 2>nul && set "HAVE_WINGET=1"

REM ============================================================
REM 1. Cek & install Node.js (kalau belum ada)
REM ============================================================
where node >nul 2>nul
if errorlevel 1 (
  echo [SETUP] Node.js tidak ada. Menginstall via winget...
  if "!HAVE_WINGET!"=="1" (
    winget install --id OpenJS.NodeJS.LTS -e --accept-source-agreements --accept-package-agreements --silent
    echo [SETUP] Node terinstal. TUTUP jendela ini lalu double-click lagi ^(PATH perlu refresh^).
    pause
    exit /b 0
  ) else (
    echo [ERROR] winget tidak ada. Install manual: https://nodejs.org
    pause
    exit /b 1
  )
)
echo [OK] Node.js: 
node --version

REM ============================================================
REM 2. Cek & install uv (Python package manager)
REM ============================================================
where uv >nul 2>nul
if errorlevel 1 (
  echo [SETUP] uv tidak ada. Menginstall...
  if "!HAVE_WINGET!"=="1" (
    winget install --id astral-sh.uv -e --accept-source-agreements --accept-package-agreements --silent
    echo [SETUP] uv terinstal. TUTUP jendela ini lalu double-click lagi.
    pause
    exit /b 0
  ) else (
    powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
    echo [SETUP] uv terinstal. TUTUP jendela ini lalu double-click lagi.
    pause
    exit /b 0
  )
)
echo [OK] uv:
uv --version

REM ============================================================
REM 3. Bersihkan sisa proses lama di port 8000/3000
REM ============================================================
echo [1/6] Bersihkan port lama...
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":8000 .*LISTENING"') do taskkill /PID %%p /F >nul 2>nul
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":3000 .*LISTENING"') do taskkill /PID %%p /F >nul 2>nul

REM ============================================================
REM 4. Install dependensi kalau belum ada (hanya pertama kali)
REM ============================================================
if not exist "backend\.venv" (
  echo [2/6] Install dependensi backend ^(sekali saja, ±1-2 menit^)...
  cd backend
  uv sync || (echo [ERROR] uv sync gagal & pause & exit /b 1)
  cd ..
) else (
  echo [2/6] Backend dependencies OK
)

if not exist "frontend\node_modules" (
  echo [3/6] Install dependensi frontend ^(sekali saja, ±2-3 menit^)...
  cd frontend
  call npm install --no-audit --no-fund || (echo [ERROR] npm install gagal & pause & exit /b 1)
  cd ..
) else (
  echo [3/6] Frontend dependencies OK
)

REM ============================================================
REM 5. Seed database demo kalau belum ada
REM ============================================================
if not exist "backend\mejaar.db" (
  echo [4/6] Seed database demo...
  cd backend
  uv run python seed_demo.py --api http://localhost:8000 >nul 2>nul
  cd ..
) else (
  echo [4/6] Database sudah ada
)

REM ============================================================
REM 6. Jalankan backend + frontend di window terpisah
REM ============================================================
echo [5/6] Jalankan backend di http://localhost:8000 ...
start "MejaAR API" /min cmd /c "cd /d "%~dp0backend" && uv run uvicorn app.main:app --port 8000"

echo [6/6] Jalankan frontend di http://localhost:3000 ...
start "MejaAR Web" /min cmd /c "cd /d "%~dp0frontend" && npx next dev -p 3000"

REM ============================================================
REM 7. Tunggu kedua layanan siap (max 90 detik)
REM ============================================================
echo.
echo Menunggu layanan siap.
set /a TRIES=0
:WAIT_API
timeout /t 2 /nobreak >nul
curl -s -o nul -w "%%{http_code}" http://localhost:8000/healthz 2>nul | findstr 200 >nul
if errorlevel 1 (
  set /a TRIES+=1
  if !TRIES! GEQ 45 (echo [ERROR] API tidak kunjung siap. Cek window "MejaAR API". & pause & exit /b 1)
  echo   ...API belum siap ^(%%TRIES%%^)
  goto WAIT_API
)
echo [OK] API siap di :8000

set /a TRIES=0
:WAIT_WEB
timeout /t 2 /nobreak >nul
curl -s -o nul -w "%%{http_code}" http://localhost:3000/login 2>nul | findstr 200 >nul
if errorlevel 1 (
  set /a TRIES+=1
  if !TRIES! GEQ 45 (echo [ERROR] Web tidak kunjung siap. Cek window "MejaAR Web". & pause & exit /b 1)
  echo   ...Web belum siap
  goto WAIT_WEB
)
echo [OK] Web siap di :3000

echo.
echo ================================================
echo    SEMUA SIAP!
echo ================================================
echo   Dashboard : http://localhost:3000/login
echo   Login     : demo@mejaar.id / MejaAR-2026!
echo   Menu pub  : http://localhost:3000/public/meja-aresto?table=T-01
echo   API docs  : http://localhost:8000/docs
echo.
echo   Matikan semua: double-click stop.bat
echo ================================================
echo.
start http://localhost:3000/login
timeout /t 10 >nul
exit /b 0
