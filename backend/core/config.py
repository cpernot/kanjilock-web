# backend/core/config.py
from pathlib import Path
import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY") 

# Check if we have credentials before creating the client to avoid crashing on import
if url and key:
    supabase: Client = create_client(url, key)
else:
    print("⚠️ Warning: SUPABASE_URL or SUPABASE_KEY missing. Supabase client not initialized.")
    supabase = None


# 📁 Racine du projet
PROJECT_ROOT = Path(__file__).resolve().parents[2]

# 📁 Dossiers
BACKEND_DIR = PROJECT_ROOT / "backend"
FRONTEND_DIR = PROJECT_ROOT / "frontend-next" / "out"
DATA_DIR = PROJECT_ROOT / "main_data"

# 📄 Fichiers
KANJI_FILE = DATA_DIR / "kanjilock.json"
PROGRESS_FILE = DATA_DIR / "progress.json"
LOG_FILE = DATA_DIR / "events.log.jsonl"
SESSION_FILE = DATA_DIR/ "sessions.jsonl"

TIMER_TIME = 5000

WEIGHTS = {    1: 5,    2: 3,    3: 1,    4: 0.2}
# 👤 User (temporaire)
# USER_ID = "1449281248039141440"
QUIZ_SESSIONS = {}
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
            "signification": k["signification"],
            "boite": k["boite"]
        }
    },
    
    "qd": {
        "question": lambda kanji, k:k["mot"],
        "answer":   lambda kanji, k: k["lecture_mot"],
        "extras":   lambda kanji, k: {
            "signification_mot": k["signification_mot"],
            "kanji": kanji,
            "romaji": k["romaji"],
            "signification": k["signification"],
            "boite": k["boite"] 
        }
    },
    
    "qe": {
        "question": lambda kanji, k:k["signification_mot"],
        "answer":   lambda kanji, k: k["mot"],
        "extras":   lambda kanji, k: {
            "signification_mot": k["lecture_mot"],
            "kanji": kanji,
            "romaji": k["romaji"],
            "signification": k["signification"],
            "boite": k["boite"] 
        }
    },
    "qf": {
        "question": lambda kanji, k: kanji,
        "answer":   lambda kanji, k: k["romaji"],
        "extras":   lambda kanji, k: {
            "signification": k["signification"],
            "mot": k["mot"],
            "lecture_mot": k["lecture_mot"],
            "signification_mot": k["signification_mot"], 
            "boite": k["boite"],            
        },
        "is_valid": lambda k: bool(k.get("romaji"))
    },
    
    "qg": {
        "question": lambda kanji, k: kanji,
        "answer":   lambda kanji, k: k["boite"],
        "extras":   lambda kanji, k: {
            "signification": k["signification"],
            "romaji": k["romaji"],
            "mot": k["mot"],
            "lecture_mot": k["lecture_mot"],
            "signification_mot": k["signification_mot"], 
        }
    },
    "intrus": {}

}