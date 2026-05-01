from fastapi import APIRouter, Request
from backend.core.config import supabase
from datetime import datetime, timedelta

router = APIRouter()

@router.get("/ranking")
def get_ranking(period: str = "all", box: str = "all"):
    """
    period: 'all', 'month', 'week', 'today'
    box: 'all' or specific box ID (e.g. '1', '2A')
    """
    # Fetch sessions
    query = supabase.table("sessions").select("*").order("session_date", desc=True).limit(3000)
    
    now = datetime.now()
    if period == "today":
        start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
        query = query.gte("session_date", start_date.isoformat())
    elif period == "week":
        start_date = (now - timedelta(days=now.weekday())).replace(hour=0, minute=0, second=0, microsecond=0)
        query = query.gte("session_date", start_date.isoformat())
    elif period == "month":
        start_date = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        query = query.gte("session_date", start_date.isoformat())
    
    response = query.execute()
    all_sessions = response.data

    results = []

    if box and box != "all":
        # --- Specific Box Selected ---
        # Show individual sessions, can have same player multiple times
        target_box = str(box).strip().lower()
        
        for s in all_sessions:
            details = s.get("details", {})
            session_box_val = details.get("box") if "box" in details else details.get("boite")
            session_box = str(session_box_val).strip().lower() if session_box_val is not None else None
            
            if session_box == target_box:
                # Format date
                raw_date = s.get("session_date") or details.get("timestamp")
                fmt_date = "---"
                if raw_date:
                    try:
                        dt = datetime.fromisoformat(raw_date.replace("Z", "+00:00"))
                        fmt_date = dt.strftime("%d/%m/%y")
                    except:
                        pass

                results.append({
                    "player": details.get("player", "Inconnu"),
                    "speed": details.get("score_global", 0),
                    "date": fmt_date,
                    "raw_date": raw_date # for sorting
                })
        
        # Sort by speed then date
        results.sort(key=lambda x: (x["speed"], x["raw_date"] or ""), reverse=True)
        
    else:
        # --- All Boxes Selected ---
        # One entry per player
        # Score = sum of best score_speed for each box
        players_data = {} # { player_name: { box_id: { max_score, date } } }
        
        for s in all_sessions:
            details = s.get("details", {})
            p_name = details.get("player", "Inconnu")
            session_box_val = details.get("box") if "box" in details else details.get("boite")
            session_box = str(session_box_val).strip().lower() if session_box_val is not None else "global"
            score = details.get("score_global", 0)
            raw_date = s.get("session_date") or details.get("timestamp")

            if p_name not in players_data:
                players_data[p_name] = {}
            
            if session_box not in players_data[p_name] or score > players_data[p_name][session_box]["score"]:
                players_data[p_name][session_box] = {
                    "score": score,
                    "date": raw_date
                }
        
        for p_name, boxes in players_data.items():
            total_score = sum(b["score"] for b in boxes.values())
            # Date is the date where this score was overwrite (latest improvement across any box)
            # Find the latest date among the best scores
            latest_date_raw = None
            for b in boxes.values():
                if not latest_date_raw or (b["date"] and b["date"] > latest_date_raw):
                    latest_date_raw = b["date"]
            
            fmt_date = "---"
            if latest_date_raw:
                try:
                    dt = datetime.fromisoformat(latest_date_raw.replace("Z", "+00:00"))
                    fmt_date = dt.strftime("%d/%m/%y")
                except:
                    pass
            
            results.append({
                "player": p_name,
                "score": total_score,
                "date": fmt_date,
                "raw_date": latest_date_raw
            })

        # Sort by total score
        results.sort(key=lambda x: (x["score"], x["raw_date"] or ""), reverse=True)

    # Return top 20
    return results[:20]

@router.get("/ranking/global")
def ranking_global():
    return get_ranking(period="all", box="all")

@router.get("/ranking/month/{year_month}")
def ranking_month(year_month: str):
    return get_ranking(period="month", box="all")