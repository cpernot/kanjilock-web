# ==========================================
# STAGE 1: Build Next.js Frontend
# ==========================================
FROM node:20 AS frontend-builder

WORKDIR /app/frontend-next

# Copy package files
COPY frontend-next/package.json frontend-next/package-lock.json ./

# Use npm install instead of ci to be more resilient to version oddities
RUN npm install

# Copy the rest of the frontend code
COPY frontend-next ./

# Build the static export
ENV NEXT_PUBLIC_API_BASE_URL=/api
RUN npm run build

# ==========================================
# STAGE 2: Build FastAPI Backend & Serve Both
# ==========================================
FROM python:3.9-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements and install
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

# Pre-download the HuggingFace embedding model
# If this fails, you can comment it out; the app will just download it on the first cold start
RUN python -c "from langchain_huggingface import HuggingFaceEmbeddings; HuggingFaceEmbeddings(model_name='all-MiniLM-L6-v2')"

# Copy the rest of the backend and data files
COPY backend ./backend
COPY main_data ./main_data

# Create the expected folder structure for the frontend output
RUN mkdir -p /app/frontend-next

# Copy the exported static files from Stage 1
COPY --from=frontend-builder /app/frontend-next/out /app/frontend-next/out

# Expose the port
EXPOSE 8080

# Start the application
CMD sh -c "uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-8080}"
