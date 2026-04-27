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