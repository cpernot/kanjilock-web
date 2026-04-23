from fastapi import APIRouter, Request
from backend.core.config import supabase

router = APIRouter()

def compute_ranking(db_sessions):
    players = {}

    for row in db_sessions:
        # On extrait les données de la colonne 'details' stockée dans Supabase
        s = row.get("details", {})
        
        # On récupère le nom du joueur (ou l'USER_ID)
        p = s.get("player", "Inconnu")
        
        players.setdefault(p, {
            "player": p,
            "sessions": 0,
            "score": 0,
            "correct": 0,
            "time_ms": 0
        })

        players[p]["sessions"] += 1
        players[p]["score"] += s.get("score_global", 0)
        players[p]["correct"] += s.get("correct", 0)
        players[p]["time_ms"] += s.get("total_time_ms", 0)
        
    # Calcul des moyennes et tri
    for p_name in players:
        p_data = players[p_name]
        p_data["avg_score"] = p_data["score"] / p_data["sessions"] if p_data["sessions"] > 0 else 0

    ranking = list(players.values())
    ranking.sort(key=lambda x: (x["score"], x["correct"]), reverse=True)
    
    return ranking

@router.get("/ranking/global")
def ranking_global():
    # On récupère toutes les lignes de la table sessions
    response = supabase.table("sessions").select("*").execute()
    return compute_ranking(response.data)

@router.get("/ranking/month/{year_month}")
def ranking_month(year_month: str):
    """
    year_month = '2026-04'
    """
    # Robust date range: from YYYY-MM-01 to first day of next month
    from datetime import datetime, timedelta
    try:
        start_date = datetime.strptime(f"{year_month}-01", "%Y-%m-%d")
        # Go to next month
        if start_date.month == 12:
            end_date = datetime(start_date.year + 1, 1, 1)
        else:
            end_date = datetime(start_date.year, start_date.month + 1, 1)
        
        response = supabase.table("sessions") \
            .select("*") \
            .gte("session_date", start_date.strftime("%Y-%m-%d")) \
            .lt("session_date", end_date.strftime("%Y-%m-%d")) \
            .execute()
    except Exception as e:
        print(f"Error in ranking_month: {e}")
        # Fallback to the old method if date parsing fails
        response = supabase.table("sessions") \
            .select("*") \
            .gte("session_date", f"{year_month}-01") \
            .lt("session_date", f"{year_month}-32") \
            .execute()
        
    return compute_ranking(response.data)