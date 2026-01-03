import json
from pathlib import Path
from backend.core.config import KANJI_FILE

def load_kanjilock():
    with open(KANJI_FILE, "r", encoding="utf-8") as f:
        return json.load(f)
