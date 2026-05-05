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
    for /f "tokens=1* delims==" %%a in (.env) do (
        set %%a=%%b
    )
) else (
    echo [!] ERROR: .env file not found.
    pause
    exit /b 1
)

:: Debug: show what we loaded
echo.
echo Project Config:
echo   Project ID:   %GCP_PROJECT_ID%
echo   Service Name: %GCP_SERVICE_NAME%
echo.

:: Check if required GCP variables are loaded from .env
if "%GCP_PROJECT_ID%"=="" (
    echo [!] ERROR: GCP_PROJECT_ID not found in .env.
    pause
    exit /b 1
)
if "%GCP_SERVICE_NAME%"=="" (
    echo [!] ERROR: GCP_SERVICE_NAME not found in .env.
    pause
    exit /b 1
)

set SERVICE_NAME=%GCP_SERVICE_NAME%
set PROJECT_ID=%GCP_PROJECT_ID%
set REGION=asia-northeast1

echo [0.5/2] Checking and enabling required Google Cloud APIs...

:: Explicitly set the project to ensure we are working on the right one
call gcloud config set project %PROJECT_ID% --quiet

:: Enable services (including containerregistry just in case)
echo Enabling Artifact Registry, Cloud Build, and Cloud Run...
call gcloud services enable artifactregistry.googleapis.com cloudbuild.googleapis.com run.googleapis.com containerregistry.googleapis.com --project %PROJECT_ID% --quiet

echo [1/2] Starting deployment for %SERVICE_NAME% in project %PROJECT_ID%...
echo This may take a few minutes. Logs will be saved to deploy_log.txt.

:: Run deployment and capture output
call gcloud run deploy %SERVICE_NAME% ^
  --project %PROJECT_ID% ^
  --source . ^
  --region %REGION% ^
  --allow-unauthenticated ^
  --memory 2Gi ^
  --cpu 1 ^
  --cpu-boost ^
  --quiet ^
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
