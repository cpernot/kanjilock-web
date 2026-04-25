@echo off
REM KanjiLock Launcher
echo ==========================================
echo    KANJILOCK DEVELOPMENT LAUNCHER
echo ==========================================
echo.

echo [1/2] Starting Backend (FastAPI with Conda)...
:: Using absolute path to your Miniconda activation script
start "KanjiLock_Backend" cmd /k "call C:\Users\owner\miniconda3\Scripts\activate.bat kanji-env && python start.py"

echo [2/2] Starting Frontend (Next.js)...
cd frontend-next
start "KanjiLock_Frontend" cmd /k "npm run dev"

echo.
echo ==========================================
echo Success! Launching in progress...
echo ------------------------------------------
echo Backend API: http://localhost:8000
echo Frontend:    http://localhost:3000
echo ==========================================
pause
