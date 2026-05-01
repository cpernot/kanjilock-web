# backend/core/config.py
from pathlib import Path
import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

# --- SUPABASE CONFIG ---
url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY") 
supabase: Client = create_client(url, key)

# --- PATHS ---
PROJECT_ROOT = Path(__file__).resolve().parents[2]
BACKEND_DIR = PROJECT_ROOT / "backend"
FRONTEND_DIR = PROJECT_ROOT / "frontend-next" / "out"
DATA_DIR = PROJECT_ROOT / "main_data"

# --- LEGACY FILE PATHS ---
KANJI_FILE = DATA_DIR / "kanjilock.json"
PROGRESS_FILE = DATA_DIR / "progress.json"
LOG_FILE = DATA_DIR / "events.log.jsonl"
SESSION_FILE = DATA_DIR / "sessions.jsonl"

# --- AI CONFIG ---
LLM_PROVIDER = os.getenv("LLM_PROVIDER", "gemini").lower()
GEMINI_MODEL = "gemma-3-27b-it"
GROQ_MODEL = "qwen/qwen3-32b"

# --- PROMPTS ---
SENSEI_SYSTEM_RULES = (
    "You are 'UnLock', the expert Kanji Sensei for the KanjiLock app. "
    "You are trilingual (Japanese, French, English) and start with Japanese and French"
    " if the user start to use English you shift to Japanese and English."
    " When you use kanji, provide the romaji in brackets [ ] and the French (or English) translation in parentheses. "
    "Example: 電車「densha」は速い「hayai」(le train est rapide)\n"
    "Respond concisely (under 150 chars if possible) but accurately. "
    "\n\nAPP RULES YOU MUST KNOW:\n"
    "1. Box Mastery: Levels (1-4) only INCREASE. We use Math.max to prevent downgrades.\n"
    "2. All-Good Mode: Wrong answers or timeouts do NOT advance progress. Failed kanji are reinjected at the end. "
    "Crucial: A first-try failure prevents level-up for that session AND applies a -1 level penalty.\n"
    "3. Progressive Mode: Always defaults to the highest unlocked box.\n"
    "4. Mastery Code: The 8-digit code on flashcards (e.g., 10300100) represents SRS levels for modes qa to qh in order.\n"
    "5. Speed Score: 100 points for avg <2s, 0 points for >10s. Decay is ~1pt per 80ms over 2s.\n"
    "\nBEHAVIOR:\n"
    "- Be encouraging and slightly formal (Sensei persona).\n"
    "- If a user asks about progress, explain the 'First-Try Success' rule.\n"
    "- Use brackets for translations like: 'C'est parfait [It is perfect].'"
    "- If a user asks for romaji, provide it in brackets [ ]"
)

# --- QUIZ DEFAULTS ---
QUIZ_SESSIONS = {}
TIMER_TIME = 5000
WEIGHTS = { 1: 5, 2: 3, 3: 1, 4: 0.2 }

from datetime import timedelta

SRS_INTERVALS = [
    timedelta(minutes=10),   # level 0
    timedelta(hours=1),      # level 1
    timedelta(days=1),       # level 2
    timedelta(days=3),       # level 3
    timedelta(days=7),       # level 4
    timedelta(days=21),      # level 5
]

QUIZ_MODES = {
    "qa": {
        "question": lambda kanji, k: kanji,
        "answer":   lambda kanji, k: k["signification"],
        "extras":   lambda kanji, k: {
            "romaji": k["romaji"],
            "mot": k["mot"],
            "signification_mot": k["signification_mot"],
            "lecture_mot": k["lecture_mot"],
            "boite": k["boite"]
        }
    },
    "qb": {
        "question": lambda kanji, k: k["signification"],
        "answer":   lambda kanji, k: kanji,
        "extras":   lambda kanji, k: {
            "romaji": k["romaji"],
            "mot": k["mot"],
            "signification_mot": k["signification_mot"],
            "lecture_mot": k["lecture_mot"],
            "boite": k["boite"]
        }
    },
    "qc": {
        "question": lambda kanji, k: k["mot"],
        "answer":   lambda kanji, k: k["signification_mot"],
        "extras":   lambda kanji, k: {
            "lecture_mot": k["lecture_mot"],
            "kanji": kanji,
            "romaji": k["romaji"],
            "boite": k["boite"]
        }
    },
    "qd": {
        "question": lambda kanji, k: kanji,
        "answer":   lambda kanji, k: k["boite"],
        "extras":   lambda kanji, k: {
            "signification": k["signification"],
            "romaji": k["romaji"],
            "lecture_mot": k["lecture_mot"],
            "signification_mot": k["signification_mot"], 
        }
    },
    "qe": {
        "question": lambda kanji, k: kanji,
        "answer":   lambda kanji, k: k["romaji"],
        "extras":   lambda kanji, k: {
            "signification": k["signification"],
            "lecture_mot": k["lecture_mot"],
            "signification_mot": k["signification_mot"], 
            "boite": k["boite"],
        },
        "is_valid": lambda k: bool(k.get("romaji"))
    },
    "intrus": {}
}