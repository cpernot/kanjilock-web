@echo off
echo Deploying KanjiLock to Google Cloud Run...

gcloud run deploy kanjilock-web ^
  --source . ^
  --region asia-northeast1 ^
  --allow-unauthenticated ^
  --memory 2Gi ^
  --set-env-vars "SUPABASE_URL=YOUR_SUPABASE_URL,SUPABASE_KEY=YOUR_SUPABASE_KEY,GROQ_API_KEY=YOUR_GROQ_API_KEY,ENABLE_CHAT=true,LLM_PROVIDER=groq"

echo Deployment finished!
pause
