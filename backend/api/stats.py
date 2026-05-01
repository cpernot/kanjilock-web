from datetime import datetime, timedelta
import calendar
from backend.data.progress import load_data, get_player_settings
from backend.data.session_stats import load_sessions 
# from backend.core.config import USER_ID
from fastapi import APIRouter, Request

router = APIRouter()

def get_start_of_period(range_type: str, last_baseline_update: str = None):
    now = datetime.now()
    if range_type == "today":
        return now.replace(hour=0, minute=0, second=0, microsecond=0)
    
    if range_type == "all":
        return None
    
    base_date = None
    if last_baseline_update:
        try:
            # Handle different ISO formats (some might have Z, some +00:00)
            clean_date = last_baseline_update.replace("Z", "+00:00")
            base_date = datetime.fromisoformat(clean_date)
        except Exception as e:
            print(f"Error parsing last_baseline_update: {e}")
            
    if range_type == "week":
        if base_date:
            target_weekday = base_date.weekday() # 0=Monday, 6=Sunday
            current_weekday = now.weekday()
            diff = (current_weekday - target_weekday) % 7
            start = now - timedelta(days=diff)
            return start.replace(hour=0, minute=0, second=0, microsecond=0)
        else:
            # Default to Monday
            start = now - timedelta(days=now.weekday())
            return start.replace(hour=0, minute=0, second=0, microsecond=0)

    if range_type == "month":
        if base_date:
            target_day = base_date.day
            if now.day >= target_day:
                return now.replace(day=target_day, hour=0, minute=0, second=0, microsecond=0)
            else:
                # Previous month calculation
                first_of_this_month = now.replace(day=1)
                last_day_prev_month = first_of_this_month - timedelta(days=1)
                _, days_in_prev = calendar.monthrange(last_day_prev_month.year, last_day_prev_month.month)
                actual_day = min(target_day, days_in_prev)
                return last_day_prev_month.replace(day=actual_day, hour=0, minute=0, second=0, microsecond=0)
        else:
            return now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            
    return None

@router.get("/stats")
def stats_api(request: Request, mode: str = "qa", player: str = "Anonymous"):
    # 1. On importe le cache depuis main pour éviter de relire le fichier JSON
    kanji_cache = getattr(request.app.state, "kanji_cache", {})
    
    # 2. On charge la progression depuis Supabase via load_data (avec l'ID !)
    data = load_data(player)

    if not data:
        return {"srs_levels": {1: 0, 2: 0, 3: 0, 4: 0}, "kanjis": []}

    # Récupération des réglages pour le filtrage temporel
    settings = get_player_settings(player) or {}
    last_reset = settings.get("targets", {}).get("lastBaselineUpdate")
    
    ranges = ["today", "week", "month", "all"]
    start_dates = {r: get_start_of_period(r, last_reset) for r in ranges}

    # 3. Calcul des stats journalières à partir des sessions
    all_sessions = load_sessions(player)
    daily_stats = {}
    
    # Summaries for all ranges
    summaries = {
        r: {"total_answers": 0, "total_sessions": 0, "days_active": set()} 
        for r in ranges
    }

    for s in all_sessions:
        d_str = s.get("session_date") 
        if not d_str: continue
        
        try:
            # ISO timestamp handling
            s_dt = datetime.fromisoformat(d_str.replace("Z", "+00:00")).replace(tzinfo=None)
            date_key = d_str.split("T")[0] 
            
            details = s.get("details", {})
            # FALLBACK logic for older session formats
            answers = details.get("answers", [])
            count = len(answers) if isinstance(answers, list) and len(answers) > 0 else int(details.get("correct", 0))
            
            # 1. Update Heatmap (All Time)
            daily_stats[date_key] = daily_stats.get(date_key, 0) + count
            
            # 2. Update Summaries
            for r in ranges:
                start_date = start_dates[r]
                if not start_date or s_dt >= start_date:
                    summaries[r]["total_answers"] += count
                    summaries[r]["total_sessions"] += 1
                    summaries[r]["days_active"].add(date_key)
        except:
            continue

    # Convert sets to counts for summaries
    for r in ranges:
        summaries[r]["days_active"] = len(summaries[r]["days_active"])

    # 3. Extraction des données SRS pour le mode choisi
    srs_all_modes = data.get("srs", {})
    srs = srs_all_modes.get(mode, {})

    # 4. Calcul des niveaux SRS
    srs_levels = {1: 0, 2: 0, 3: 0, 4: 0}
    for v in srs.values():
        lvl = v.get("level", 1)
        if lvl in srs_levels:
            srs_levels[lvl] += 1

    # 5. Construction de la liste détaillée des Kanjis
    kanji_list = []
    for k_char, v_stats in srs.items():
        k_info = kanji_cache.get(k_char, {})
        kanji_entry = {
            "kanji": k_char,
            "level": v_stats.get("level"),
            "next_review": v_stats.get("next_review"),
        }
        kanji_entry.update(k_info)
        kanji_list.append(kanji_entry)

    # 6. History Calculation (Activity per period)
    history = {
        "kanji": {"day": [], "week": [], "month": [], "year": []},
        "box": {"day": [], "week": [], "month": [], "year": []}
    }

    sessions_by_date = {}
    for s in all_sessions:
        s_date = s.get("session_date", "").split("T")[0]
        if not s_date: continue
        details = s.get("details", {})
        if details.get("mode", "qa") != mode: continue
        
        for ans in details.get("answers", []):
            k, lvl = ans.get("kanji"), ans.get("newLevel")
            if not k: k = ans.get("character") # Fallback
            if not lvl: lvl = ans.get("level", 1) # Fallback
            
            if s_date not in sessions_by_date:
                sessions_by_date[s_date] = {"kanji": [], "box": []}
            sessions_by_date[s_date]["kanji"].append(lvl)
            
        box_id = details.get("box")
        box_rank = details.get("boxRanking")
        if box_id:
            if s_date not in sessions_by_date:
                sessions_by_date[s_date] = {"kanji": [], "box": []}
            
            lvl = 1
            # Check various common key names for levels in session details
            if isinstance(box_rank, dict):
                lvl = box_rank.get("level") or box_rank.get("newLevel") or box_rank.get("oldLevel") or 1
            elif isinstance(box_rank, (int, float)):
                lvl = int(box_rank)
                
            sessions_by_date[s_date]["box"].append(lvl)

    def get_activity_for_period(start_date, end_date):
        all_kanji_lvls = []
        all_box_lvls = []
        for d, data in sessions_by_date.items():
            if start_date <= d <= end_date:
                all_kanji_lvls.extend(data["kanji"])
                all_box_lvls.extend(data["box"])
        
        k_levels = {1: 0, 2: 0, 3: 0, 4: 0}
        b_levels = {1: 0, 2: 0, 3: 0, 4: 0}
        for lvl in all_kanji_lvls:
            if lvl in k_levels: k_levels[lvl] += 1
        for lvl in all_box_lvls:
            if lvl in b_levels: b_levels[lvl] += 1
        return {"kanji": k_levels, "box": b_levels}

    now = datetime.now()
    # Day: Last 12 days
    for i in range(11, -1, -1):
        d = (now - timedelta(days=i)).strftime("%Y-%m-%d")
        act = get_activity_for_period(d, d)
        history["kanji"]["day"].append({"label": d[5:], "levels": {str(k): v for k,v in act["kanji"].items()}})
        history["box"]["day"].append({"label": d[5:], "levels": {str(k): v for k,v in act["box"].items()}})
    # Week: Last 12 weeks
    for i in range(11, -1, -1):
        end = (now - timedelta(weeks=i))
        start = end - timedelta(days=6)
        act = get_activity_for_period(start.strftime("%Y-%m-%d"), end.strftime("%Y-%m-%d"))
        history["kanji"]["week"].append({"label": f"W-{i}" if i > 0 else "Now", "levels": {str(k): v for k,v in act["kanji"].items()}})
        history["box"]["week"].append({"label": f"W-{i}" if i > 0 else "Now", "levels": {str(k): v for k,v in act["box"].items()}})
    # Month: Last 12 months
    for i in range(11, -1, -1):
        end = (now - timedelta(days=i*30))
        start = end - timedelta(days=29)
        act = get_activity_for_period(start.strftime("%Y-%m-%d"), end.strftime("%Y-%m-%d"))
        history["kanji"]["month"].append({"label": end.strftime("%b"), "levels": {str(k): v for k,v in act["kanji"].items()}})
        history["box"]["month"].append({"label": end.strftime("%b"), "levels": {str(k): v for k,v in act["box"].items()}})
    # Year
    years = sorted(list(set(d[:4] for d in sessions_by_date.keys())))
    if not years: years = [str(now.year)]
    for y in years:
        act = get_activity_for_period(f"{y}-01-01", f"{y}-12-31")
        history["kanji"]["year"].append({"label": y, "levels": {str(k): v for k,v in act["kanji"].items()}})
        history["box"]["year"].append({"label": y, "levels": {str(k): v for k,v in act["box"].items()}})

    return {
        "srs_levels": {str(k): v for k, v in srs_levels.items()},
        "daily_stats": daily_stats,
        "kanjis": kanji_list,
        "history": history,
        "summaries": summaries
    }
