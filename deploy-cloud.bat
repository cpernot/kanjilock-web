@echo off
setlocal enabledelayedexpansion

echo ========================================
echo   Deploying KanjiLock to Google Cloud
echo ========================================
echo.

:: Set variables
set SERVICE_NAME=kanjilock-web
set REGION=asia-northeast1

:: Load credentials from .env
echo [0/2] Loading configuration from .env...
if exist .env (
    for /f "usebackq tokens=1* delims==" %%a in (".env") do (
        set "key=%%a"
        set "value=%%b"
        if not "!key:~0,1!"=="#" (
            set "!key!=!value!"
        )
    )
) else (
    echo [!] ERROR: .env file not found. Please create one with your credentials.
    pause
    exit /b 1
)

echo [1/2] Starting deployment for %SERVICE_NAME%...
echo This may take a few minutes. Logs will be saved to deploy_log.txt.

:: Run deployment and capture output
gcloud run deploy %SERVICE_NAME% ^
  --source . ^
  --region %REGION% ^
  --allow-unauthenticated ^
  --memory 2Gi ^
  --cpu 1 ^
  --cpu-boost ^
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
