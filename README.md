# KanjiLock 🔒

**KanjiLock** is a Progressive Web App (PWA) designed to master Kanji using a Spaced Repetition System (SRS). 
It combines a game-like quiz interface with a robust tracking system to ensure long-term retention.

![Status](https://img.shields.io/badge/Status-Active-success)
![Backend](https://img.shields.io/badge/Backend-FastAPI-blue)
![Frontend](https://img.shields.io/badge/Frontend-Vanilla_JS-yellow)
![Database](https://img.shields.io/badge/Database-Supabase-green)

## 🏗 Architecture

The application operates on a free-tier architecture optimized for cost-efficiency:

* **Frontend (Vercel):** Hosts the static entry point (`index.html`, CSS, JS) and handles the UI.
* **Backend (Render):** A Python FastAPI service that handles SRS logic, processes quiz results, and manages API endpoints.
* **Database (Supabase):** Stores Kanji data (`kanji` table) and user progress (`kanji_progress` table).

## 📂 File Structure

```text
KanjiLock/
├── backend/
│   ├── api/             # API Endpoints (quiz, stats, etc.)
│   ├── core/            # Core logic (SRS algorithms, config)
│   ├── data/            # Data processing & backup scripts
│   └── main.py          # Application entry point
├── frontend/
│   ├── static/          # Assets (css, js, sounds, icons)
│   └── templates/       # HTML templates (if using Jinja2)
├── main_data/           # JSON Backups and logs
├── start.py             # Local development launcher
├── requirements.txt     # Python dependencies
└── vercel.json          # Vercel deployment configuration

🚀 Installation & Local Setup
Prerequisites

    Python 3.9+

    Git

    A Supabase account

Steps

    Clone the Repository
    Bash

    git clone [https://github.com/YOUR_USERNAME/kanjilock.git](https://github.com/YOUR_USERNAME/kanjilock.git)
    cd kanjilock

    Environment Setup Create a .env file in the root directory:
    Ini, TOML

    SUPABASE_URL="your_supabase_url_here"
    SUPABASE_KEY="your_supabase_anon_key_here"
    # Add other keys if necessary (e.g., GROQ_API_KEY for V2)

    Install Dependencies
    Bash

    python -m venv venv
    source venv/bin/activate  # Windows: venv\Scripts\activate
    pip install -r requirements.txt

    Run Locally
    Bash

    python start.py

    The app will be available at http://localhost:8000.

⚠️ Limitations (Free Tier)

Since this project runs on free-tier infrastructure, please be aware of the following:

    "Cold Start" Delay: Render puts the backend service to sleep after 15 minutes of inactivity. The first request after a break may take 50-60 seconds to wake up the server.

    Database Quotas: Supabase free tier has a 500MB database limit (sufficient for thousands of Kanji, but monitor if adding heavy logs).

    Vercel Functions: If using serverless functions on Vercel, execution time is capped at 10 seconds.

🛠 Future Roadmap (V2)

    Chatbot Integration: AI-powered tutor using GroqCloud.

    Advanced SRS: New "Box" ranking system (Levels 1-4).

    Enhanced UI: Detailed progress visualization per Kanji box.