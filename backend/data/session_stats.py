import json
from pathlib import Path
from datetime import datetime
from backend.core.config import SESSION_FILE 
from backend.core.config import supabase

def load_sessions():
    response = supabase.table('sessions').select("*").execute()
    return response.data 

def load_sessions_old():
    if not SESSION_FILE.exists():
        return []

    sessions = []
    with open(SESSION_FILE, encoding="utf-8") as f:
        for line in f:
            sessions.append(json.loads(line))
    return sessions


def filter_month(sessions, year_month):
    return [
        s for s in sessions
        if s["timestamp"].startswith(year_month)
    ]
