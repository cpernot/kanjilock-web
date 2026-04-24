FROM python:3.9-slim

WORKDIR /app

# Install dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY . .

# Environment variables (to be set in Cloud Run dashboard or via CLI)
# SUPABASE_URL, SUPABASE_KEY, GEMINI_API_KEY, ENABLE_CHAT

# Start the application
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8080"]
