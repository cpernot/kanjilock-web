from fastapi import APIRouter, Request
from backend.core.config import supabase
from datetime import datetime, timedelta

router = APIRouter()

@router.get("/ranking")
def get_ranking(period: str = "all", box: str = "all", mode: str = "all"):
    """
    period: 'all', 'month', 'week', 'today'
    box: 'all' or specific box ID (e.g. '1', '2A')
    mode: 'all' or specific quiz mode (e.g. 'qa', 'qb')
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

    # Filter by mode if requested
    if mode and mode != "all":
        target_mode = str(mode).strip().lower()
        all_sessions = [
            s for s in all_sessions 
            if str(s.get("details", {}).get("mode")).strip().lower() == target_mode
        ]

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
                    "player": str(details.get("player", "Inconnu")).strip(),
                    "speed": details.get("score_global", 0),
                    "date": fmt_date,
                    "raw_date": raw_date # for sorting
                })
        
        # Sort by speed then date
        results.sort(key=lambda x: (x["speed"], x["raw_date"] or ""), reverse=True)
        
    else:
        # --- All Boxes Selected ---
        # One entry per player
        # Score = sum of best score_global for each unique box
        players_data = {} # { player_name: { box_id: { max_score, date } } }
        
        # Get master list of boxes for filtering
        from backend.box_metadata import BOX_ORDER
        valid_box_ids = [str(b).strip().lower() for b in BOX_ORDER]

        for s in all_sessions:
            details = s.get("details", {})
            p_name = str(details.get("player", "Inconnu")).strip()
            
            # Normalize Box ID
            session_box_val = details.get("box") if "box" in details else details.get("boite")
            if session_box_val is None:
                session_box = "global"
            else:
                session_box = str(session_box_val).strip().lower()
                # Handle potential ".0" suffix from numeric storage
                if session_box.endswith(".0"):
                    session_box = session_box[:-2]
            
            score = details.get("score_global", 0)
            raw_date = s.get("session_date") or details.get("timestamp")

            if p_name not in players_data:
                players_data[p_name] = {}
            
            # Grouping by normalized session_box ensures we only keep the best score for THAT box
            if session_box not in players_data[p_name] or score > players_data[p_name][session_box]["score"]:
                players_data[p_name][session_box] = {
                    "score": score,
                    "date": raw_date
                }
        
        for p_name, boxes in players_data.items():
            # CRITICAL: Only sum scores for valid individual boxes.
            # This excludes "global" or empty "" sessions (All Boxes mode) which would double count.
            total_score = sum(
                b_data["score"] 
                for b_id, b_data in boxes.items() 
                if b_id in valid_box_ids
            )
            
            # Date is the latest improvement across any box
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