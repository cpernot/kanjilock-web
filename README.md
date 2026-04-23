# KanjiLock 🔒

**KanjiLock** is a Spaced Repetition System (SRS) powered application designed to help you master Japanese Kanji. It combines a smart quiz engine with an AI-powered tutor to ensure long-term retention.

![Status](https://img.shields.io/badge/Status-Active-success)
![Backend](https://img.shields.io/badge/Backend-FastAPI-blue)
![Frontend](https://img.shields.io/badge/Frontend-Next.js-black)
![AI](https://img.shields.io/badge/AI-SenseiLock_Groq-orange)
![Database](https://img.shields.io/badge/Database-Supabase-green)

## ✨ Features

- **Smart SRS Engine:** Automated Spaced Repetition logic to prioritize Kanji you struggle with.
- **SenseiLock AI:** A RAG-powered Japanese tutor using Groq (Llama 3) to answer questions about Kanji and app rules.
- **Box System:** Progress through 150+ boxes, unlocking new levels as you master each set.
- **Modern UI:** Transitioning to a high-performance Next.js frontend with smooth animations.
- **Cross-Platform:** Works as a PWA on mobile and desktop.

## 🏗 Architecture

The application operates on a free-tier architecture optimized for cost-efficiency:

* **Frontend (Vercel):** Next.js application for a modern, responsive user experience.
* **Backend (Render):** Python FastAPI service handling SRS logic, vector storage for AI, and database orchestration.
* **Database (Supabase):** Cloud PostgreSQL for Kanji data and persistent user progress.
* **AI Engine:** LangChain + FAISS + Groq for retrieval-augmented generation.

## 📂 File Structure

```text
KanjiLock/
├── backend/
│   ├── api/             # FastAPI Routers (quiz, stats, chat)
│   ├── core/            # Configuration and SRS logic
│   └── main.py          # Backend entry point
├── frontend-next/       # Modern Next.js Frontend
├── frontend/            # Legacy Vanilla JS Frontend (Static)
├── main_data/           # Local backups and reference data
└── vercel.json          # Deployment config
```

## 🚀 Installation & Local Setup

### Prerequisites
- Python 3.9+
- Node.js & npm (for Next.js)
- A Supabase account
- A Groq API Key (for AI features)

### Steps

1. **Clone the Repository**
   ```bash
   git clone https://github.com/cpernot/kanjilock-web.git
   cd kanjilock-web
   ```

2. **Environment Setup**
   Create a `.env` file in the root:
   ```ini
   SUPABASE_URL="your_url"
   SUPABASE_KEY="your_key"
   GROQ_API_KEY="your_groq_key"
   ENABLE_CHAT="true"
   ```

3. **Backend Setup**
   ```bash
   cd backend
   pip install -r requirements.txt
   cd ..
   python start.py
   ```

4. **Frontend Setup (Next.js)**
   ```bash
   cd frontend-next
   npm install
   npm run dev
   ```

## ⚠️ Limitations (Free Tier)

- **"Cold Start" Delay:** Render puts the backend to sleep after 15 minutes of inactivity. Initial wake-up takes ~50s.
- **Vercel Functions:** Serverless execution is capped at 10 seconds.