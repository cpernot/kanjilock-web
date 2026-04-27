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
def stats_api(request: Request, mode: str = "qa", player: str = "Anonymous", time_range: str = "all"):
    # 1. On importe le cache depuis main pour éviter de relire le fichier JSON
    kanji_cache = getattr(request.app.state, "kanji_cache", {})
    
    # 2. On charge la progression depuis Supabase via load_data (avec l'ID !)
    data = load_data(player)

    if not data:
        return {"srs_levels": {1: 0, 2: 0, 3: 0, 4: 0}, "kanjis": []}

    # NOUVEAU : Récupération des réglages pour le filtrage temporel
    settings = get_player_settings(player) or {}
    last_reset = settings.get("targets", {}).get("lastBaselineUpdate")
    
    start_date = get_start_of_period(time_range, last_reset)
    print(f"Stats filtering: range={time_range}, start_date={start_date}")

    # 3. Calcul des stats journalières à partir des sessions
    all_sessions = load_sessions(player)
    daily_stats = {}
    summary_answers = 0
    summary_sessions = 0
    summary_days = set()

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
            
            # 2. Update Summary (Filtered by Period)
            if not start_date or s_dt >= start_date:
                summary_answers += count
                summary_sessions += 1
                summary_days.add(date_key)
        except:
            continue

    # 3. Extraction des données SRS pour le mode choisi
    # La structure de data est maintenant simplifiée par load_data
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
        # On récupère les infos statiques (signification, etc.) dans le cache
        k_info = kanji_cache.get(k_char, {})
        
        kanji_entry = {
            "kanji": k_char,
            "level": v_stats.get("level"),
            "next_review": v_stats.get("next_review"),
        }
        # On fusionne avec les infos du dictionnaire kanjilock
        kanji_entry.update(k_info)
        kanji_list.append(kanji_entry)

    return {
        "srs_levels": {str(k): v for k, v in srs_levels.items()},
        "daily_stats": daily_stats,
        "kanjis": kanji_list,
        "summary": {
            "total_answers": summary_answers,
            "total_sessions": summary_sessions,
            "days_active": len(summary_days),
            "range": time_range
        }
    }