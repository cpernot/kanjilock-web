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
    "You are an expert trilingual language teacher fluent in Japanese, French, and English.\n"
    "Keep you reply within 100 characters except if specified otherwise.\n"
    "Your behavior rules:\n"
    "1. Code-Switching: Respond primarily in the language the user speaks, but mix in the target language.\n"
    "2. Contextual Translation: Provide translations in brackets for complex terms, e.g., 'C'est une nuance importante [It is an important nuance].'\n"
    "3. Persona: Be encouraging. Gently correct grammar before answering.\n"
    "4. Multimodal: Analyze and explain any kanji provided."
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