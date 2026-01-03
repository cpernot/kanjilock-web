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
    year_month = '2026-01'
    On utilise une requête Supabase pour filtrer par date directement dans le Cloud
    """
    # Filtre sur la colonne 'session_date' (format ISO: 2026-01-...)
    response = supabase.table("sessions") \
        .select("*") \
        .gte("session_date", f"{year_month}-01") \
        .lt("session_date", f"{year_month}-32") \
        .execute()
        
    return compute_ranking(response.data)