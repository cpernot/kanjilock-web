import json
from pathlib import Path
from datetime import datetime
from backend.core.config import SESSION_FILE 
from backend.core.config import supabase

def load_sessions(player_id=None):
    query = supabase.table('sessions').select("*")
    if player_id:
        # Filter by player ID inside the JSONB 'details' column
        query = query.eq("details->>player", player_id)
    response = query.execute()
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
        if s.get("session_date", "").startswith(year_month) # Changé 'timestamp' par 'session_date'
    ]
