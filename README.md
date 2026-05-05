# KanjiLock 🔒

**KanjiLock** is a Spaced Repetition System (SRS) powered application designed to help you master Japanese Kanji. It combines a smart quiz engine with an AI-powered tutor to ensure long-term retention.

![Status](https://img.shields.io/badge/Status-Active-success)
![Backend](https://img.shields.io/badge/Backend-FastAPI-blue)
![Frontend](https://img.shields.io/badge/Frontend-Next.js-black)
![AI](https://img.shields.io/badge/AI-UnLock_Groq-orange)
![Database](https://img.shields.io/badge/Database-Supabase-green)

## ✨ Features

- **Smart SRS Engine:** Automated Spaced Repetition logic to prioritize Kanji you struggle with.
- **UnLock AI:** A RAG-powered Japanese tutor using Groq (Llama 3) to answer questions about Kanji and app rules.
- **Sequential Learning:** Choose between SRS-weighted randomness or a fixed sequential path based on database order.
- **Dynamic Tips:** 50+ rotating learning tips displayed during loading screens.
- **Box System:** Progress through 150+ boxes, unlocking new levels (1-4) as you master each set with persistent mastery tracking.
- **Modern UI:** Glassmorphism aesthetics with a new top-bar containing quick access to Pricing, Settings, and Logout.
- **"All-Good" Mode (Refined):** High-discipline mode where errors incur a **-1 level penalty**. Missed questions must be repeated at the end of the session, and they cannot gain levels (+1) until the next session.
- **Flashcard Mastery Code:** Integrated 8-digit progress string on each flashcard, providing a real-time summary of your knowledge across all 8 quiz modes.
- **Icon Asset Pipeline:** Standardized premium icon set with transparent backgrounds and dark-mode optimization.
- **Speed Score Mastery:** New linear decay scoring (100 pts for ≤2s, 0 pts for ≥10s) with real-time average speed tracking in the session summary.
- **Target Achievements & Multi-Goals:** Set independent Daily, Weekly, or Monthly targets for both Kanji and Box Mastery. Manage sub-targets with easy add/delete controls, earn ⭐ stars for reaching goals, and view your long-term progress in a dedicated History Dashboard.
- **Cross-Platform:** Full PWA support for mobile and desktop mastery on the go.

## 🚀 Quick Start (Local Development)

To start both the frontend and backend locally on Windows:
1. Ensure you have Miniconda/Anaconda installed with the `kanji-env` environment.
2. Double-click **`starting-kanjilock.bat`** in the root directory.
3. The app will be available at:
   - Frontend: `http://localhost:3000`
   - Backend API: `http://localhost:8000`

## 🏗 Architecture

The application operates on a free-tier architecture optimized for cost-efficiency:

* **Frontend (Vercel):** Next.js application for a modern, responsive user experience.
* **Backend (Render):** Python FastAPI service handling SRS logic, vector storage for AI, and database orchestration.
* **Database (Supabase):** Cloud PostgreSQL for Kanji data, persistent user progress (SRS), and Box Mastery tracking.
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

    The app will be available at http://localhost:8000.

⚠️ Limitations (Free Tier)

Since this project runs on free-tier infrastructure, please be aware of the following:

    "Cold Start" Delay: Render puts the backend service to sleep after 15 minutes of inactivity. The first request after a break may take 50-60 seconds to wake up the server.

    Database Quotas: Supabase free tier has a 500MB database limit (sufficient for thousands of Kanji, but monitor if adding heavy logs).

    Vercel Functions: If using serverless functions on Vercel, execution time is capped at 10 seconds.

## 🛠 Future Roadmap

- **Advanced Analytics:** Heatmaps and detailed learning curves per Kanji category.
- **Gamification:** Achievement badges and community leaderboards.
- **Enhanced AI:** Voice-interactive Sensei and personalized study plans.
- **Mobile PWA:** Full offline support and native-like installation.

## 🚀 Deployment (Google Cloud Run)

To deploy the application to Google Cloud Run, you can use the following command template. For convenience, it is recommended to create a `deploy-cloud.bat` file (not tracked by git) in the root directory.

```bash
gcloud run deploy kanjilock-web \
  --source . \
  --region asia-northeast1 \
  --allow-unauthenticated \
  --memory 2Gi \
  --set-env-vars "SUPABASE_URL=YOUR_URL,SUPABASE_KEY=YOUR_KEY,GROQ_API_KEY=YOUR_KEY,ENABLE_CHAT=true,LLM_PROVIDER=groq"
```

> [!IMPORTANT]
> Never commit your real API keys to the repository. Use environment variables or a local `.bat` file excluded via `.gitignore`.

## 🗄️ Database Reset & Maintenance

If you need to perform a factory reset or clean up your logs in Supabase, understand the difference between **History** and **Progress**:

### 1. Resetting History (Safe)
This will clear your activity logs but keep your mastered Kanjis and Box levels.
*   **Table: `sessions`**: Deleting this will reset your **Activity Heatmap** and **Statistics Summary** (Total Answers, Days Active) to zero.
*   **Table: `target_history`**: Deleting this will clear your **Hall of Fame** and achievement stars, but won't affect current progress.
*   **Table: `logs`**: Safe to clear; contains internal event tracking.

### 2. Factory Reset (Deletes Everything)
This will reset your account to zero, as if you just started for the first time.
*   **Table: `progress`**: **CRITICAL.** This stores every Kanji's SRS level and your **User Settings**. Deleting this will lock all Kanjis and reset your targets.
*   **Table: `box_progress`**: Stores your Box Mastery ranks (Level 1-4). Deleting this resets all boxes to Level 0.

### 3. Static Data (Do Not Delete)
*   **Tables: `kanji`, `kanji_mot`, `flashcards`**: These are the core content. If deleted, the app will have no data to display or quiz on.

---
*Note: Always perform a backup before manual database deletions.*

## 🔌 Supabase MCP Troubleshooting
If you are using the **Supabase MCP Server** with an AI agent (like Cursor or Gemini) and encounter an **"Unauthorized"** error during initialization:
1.  **Switch to `stdio` transport**: Do not use the hosted `serverUrl` (`mcp.supabase.com/mcp`).
2.  **Use a Service Token**: Use your **Personal Access Token** (starting with `sb_secret_`) as the `--access-token` argument in your `mcp_config.json`.
3.  **Command Template**:
    ```json
    "supabase": {
      "command": "npx",
      "args": ["-y", "@supabase/mcp-server-supabase", "--access-token", "YOUR_SB_SECRET_KEY"],
      "env": { "SUPABASE_URL": "YOUR_PROJECT_URL" }
    }
    ```