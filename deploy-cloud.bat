@echo off
setlocal enabledelayedexpansion

echo ========================================
echo   Deploying KanjiLock to Google Cloud
echo ========================================
echo.

:: Set variables
set SERVICE_NAME=kanjilock-web
set REGION=asia-northeast1

:: Real credentials from .env
:: Set your real credentials here or use environment variables
set SUPABASE_URL=YOUR_SUPABASE_URL
set SUPABASE_KEY=YOUR_SUPABASE_KEY
set GROQ_API_KEY=YOUR_GROQ_API_KEY

echo [1/2] Starting deployment for %SERVICE_NAME%...
echo This may take a few minutes. Logs will be saved to deploy_log.txt.

:: Run deployment and capture output
gcloud run deploy %SERVICE_NAME% ^
  --source . ^
  --region %REGION% ^
  --allow-unauthenticated ^
  --memory 2Gi ^
  --set-env-vars "SUPABASE_URL=%SUPABASE_URL%,SUPABASE_KEY=%SUPABASE_KEY%,GROQ_API_KEY=%GROQ_API_KEY%,ENABLE_CHAT=true,LLM_PROVIDER=groq" > deploy_log.txt 2>&1

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [!] ERROR: Deployment failed. See deploy_log.txt for details.
    type deploy_log.txt | findstr /C:"ERROR" /C:"FAIL"
) else (
    echo.
    echo [OK] Deployment finished successfully!
)

echo.
echo Press any key to close this window...
pause > nul
