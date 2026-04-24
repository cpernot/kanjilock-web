# ==========================================
# STAGE 1: Build Next.js Frontend
# ==========================================
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend-next

# Copy package files and install dependencies
COPY frontend-next/package.json frontend-next/package-lock.json ./
RUN npm ci

# Copy the rest of the frontend code
COPY frontend-next ./

# Build the static export
# We set the API Base URL to a relative path so it routes to the FastAPI backend serving on the same domain
ENV NEXT_PUBLIC_API_BASE_URL=/api
RUN npm run build

# ==========================================
# STAGE 2: Build FastAPI Backend & Serve Both
# ==========================================
FROM python:3.9-slim

WORKDIR /app

# Install system dependencies (if any are needed for FAISS or similar)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements and install
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

# Pre-download the HuggingFace embedding model to prevent slow cold starts
RUN python -c "from langchain_huggingface import HuggingFaceEmbeddings; HuggingFaceEmbeddings(model_name='all-MiniLM-L6-v2')"

# Copy the rest of the backend and data files
COPY backend ./backend
COPY main_data ./main_data

# Create the expected folder structure for the frontend output
RUN mkdir -p /app/frontend-next

# Copy the exported static files from Stage 1 into the location expected by backend/core/config.py
COPY --from=frontend-builder /app/frontend-next/out /app/frontend-next/out

# Expose the port Cloud Run uses
EXPOSE 8080

# Environment variables (to be set in Cloud Run dashboard or via CLI)
# SUPABASE_URL, SUPABASE_KEY, GROQ_API_KEY, GEMINI_API_KEY, LLM_PROVIDER, ENABLE_CHAT

# Start the application
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8080"]
