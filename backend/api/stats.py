from datetime import datetime, timedelta
import calendar
from backend.data.progress import load_data, get_player_settings
from backend.data.session_stats import load_sessions
from backend.box_metadata import get_box_sort_index
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
    # 1. On charge la progression pour le mode demandé (optimisation mémoire)
    data = load_data(player, mode=mode)

    if not data:
        return {"srs_levels": {1: 0, 2: 0, 3: 0, 4: 0}, "kanjis": [], "daily_stats": {}, "history": {}, "summaries": {}}

    # Récupération des réglages pour le filtrage temporel
    settings = get_player_settings(player) or {}
    last_reset = settings.get("targets", {}).get("lastBaselineUpdate")
    
    ranges = ["today", "week", "month", "all"]
    start_dates = {r: get_start_of_period(r, last_reset) for r in ranges}

    # 2. Calcul des stats journalières à partir des sessions
    all_sessions = sorted(load_sessions(player) or [], key=lambda x: x.get("session_date") or "")
    daily_stats = {}
    
    summaries = {
        r: {"total_answers": 0, "total_sessions": 0, "days_active": set()} 
        for r in ranges
    }

    sessions_by_date = {}
    box_times_by_date = {}
    box_pb = {}  # { box_id: { "pb_cold_ms": int|None, "pb_cold_perfect_ms": int|None, "pb_best_ms": int|None, "pb_best_perfect_ms": int|None } }

    for s in all_sessions:
        d_str = s.get("session_date") 
        if not d_str: continue
        
        try:
            s_dt = datetime.fromisoformat(d_str.replace("Z", "+00:00")).replace(tzinfo=None)
            date_key = d_str.split("T")[0] 
            
            details = s.get("details", {})
            answers = details.get("answers", [])
            count = len(answers) if isinstance(answers, list) and len(answers) > 0 else int(details.get("correct", 0))
            
            # Heatmap (All Time)
            daily_stats[date_key] = daily_stats.get(date_key, 0) + count
            
            # Summaries
            for r in ranges:
                start_date = start_dates[r]
                if not start_date or s_dt >= start_date:
                    summaries[r]["total_answers"] += count
                    summaries[r]["total_sessions"] += 1
                    summaries[r]["days_active"].add(date_key)

            # Pre-aggregate by date for history graph (O(1) aggregations)
            if details.get("mode", "qa") == mode:
                if date_key not in sessions_by_date:
                    sessions_by_date[date_key] = {
                        "kanji": {1: 0, 2: 0, 3: 0, 4: 0},
                        "box": {1: 0, 2: 0, 3: 0, 4: 0}
                    }
                entry = sessions_by_date[date_key]
                for ans in answers:
                    lvl = ans.get("newLevel") or ans.get("level", 1)
                    if lvl in entry["kanji"]:
                        entry["kanji"][lvl] += 1
                
                box_id = details.get("box")
                box_rank = details.get("boxRanking")
                if box_id:
                    box_key = str(box_id)
                    lvl = 1
                    if isinstance(box_rank, dict):
                        lvl = box_rank.get("level") or box_rank.get("newLevel") or box_rank.get("oldLevel") or 1
                    elif isinstance(box_rank, (int, float)):
                        lvl = int(box_rank)
                    if lvl in entry["box"]:
                        entry["box"][lvl] += 1

                    # Box Time Tracking (avg ms per kanji)
                    total_time_ms = details.get("total_time_ms")
                    session_size = details.get("session_size") or count
                    if total_time_ms and session_size and int(session_size) > 0:
                        avg_ms = round(float(total_time_ms) / float(session_size))
                        wrong_cnt = int(details.get("wrong", 0))
                        correct_cnt = int(details.get("correct", 0))
                        is_perfect = (wrong_cnt == 0 and correct_cnt >= int(session_size))

                        if date_key not in box_times_by_date:
                            box_times_by_date[date_key] = {}

                        if box_key not in box_pb:
                            box_pb[box_key] = {
                                "pb_cold_ms": None,
                                "pb_cold_perfect_ms": None,
                                "pb_best_ms": None,
                                "pb_best_perfect_ms": None
                            }

                        if box_key not in box_times_by_date[date_key]:
                            # First run of the day (Cold Run)
                            box_times_by_date[date_key][box_key] = {
                                "cold_ms": avg_ms,
                                "cold_perfect": is_perfect,
                                "best_ms": avg_ms,
                                "best_perfect": is_perfect,
                                "runs": 1
                            }
                            if box_pb[box_key]["pb_cold_ms"] is None or avg_ms < box_pb[box_key]["pb_cold_ms"]:
                                box_pb[box_key]["pb_cold_ms"] = avg_ms
                            if is_perfect and (box_pb[box_key]["pb_cold_perfect_ms"] is None or avg_ms < box_pb[box_key]["pb_cold_perfect_ms"]):
                                box_pb[box_key]["pb_cold_perfect_ms"] = avg_ms
                        else:
                            day_box = box_times_by_date[date_key][box_key]
                            day_box["runs"] += 1
                            if avg_ms < day_box["best_ms"]:
                                day_box["best_ms"] = avg_ms
                                day_box["best_perfect"] = is_perfect

                        if box_pb[box_key]["pb_best_ms"] is None or avg_ms < box_pb[box_key]["pb_best_ms"]:
                            box_pb[box_key]["pb_best_ms"] = avg_ms
                        if is_perfect and (box_pb[box_key]["pb_best_perfect_ms"] is None or avg_ms < box_pb[box_key]["pb_best_perfect_ms"]):
                            box_pb[box_key]["pb_best_perfect_ms"] = avg_ms
        except Exception:
            continue

    # Convert sets to counts for summaries
    for r in ranges:
        summaries[r]["days_active"] = len(summaries[r]["days_active"])

    # 3. Extraction des données SRS pour le mode choisi
    srs_all_modes = data.get("srs", {})
    srs = srs_all_modes.get(mode, {})

    srs_levels = {1: 0, 2: 0, 3: 0, 4: 0}
    for v in srs.values():
        lvl = v.get("level", 1)
        if lvl in srs_levels:
            srs_levels[lvl] += 1

    # 4. History Calculation (Activity per period via O(1) integer sums)
    history = {
        "kanji": {"day": [], "week": [], "month": [], "year": []},
        "box": {"day": [], "week": [], "month": [], "year": []}
    }

    def get_activity_for_period(start_date, end_date):
        k_levels = {1: 0, 2: 0, 3: 0, 4: 0}
        b_levels = {1: 0, 2: 0, 3: 0, 4: 0}
        for d, d_data in sessions_by_date.items():
            if start_date <= d <= end_date:
                for lvl in (1, 2, 3, 4):
                    k_levels[lvl] += d_data["kanji"][lvl]
                    b_levels[lvl] += d_data["box"][lvl]
        return {"kanji": k_levels, "box": b_levels}

    now = datetime.now()
    # Day: Last 12 days
    for i in range(11, -1, -1):
        d = (now - timedelta(days=i)).strftime("%Y-%m-%d")
        act = get_activity_for_period(d, d)
        history["kanji"]["day"].append({"label": d[5:], "levels": {str(k): v for k, v in act["kanji"].items()}})
        history["box"]["day"].append({"label": d[5:], "levels": {str(k): v for k, v in act["box"].items()}})
    # Week: Last 12 weeks
    for i in range(11, -1, -1):
        end = now - timedelta(weeks=i)
        start = end - timedelta(days=6)
        act = get_activity_for_period(start.strftime("%Y-%m-%d"), end.strftime("%Y-%m-%d"))
        history["kanji"]["week"].append({"label": f"W-{i}" if i > 0 else "Now", "levels": {str(k): v for k, v in act["kanji"].items()}})
        history["box"]["week"].append({"label": f"W-{i}" if i > 0 else "Now", "levels": {str(k): v for k, v in act["box"].items()}})
    # Month: Last 12 months
    for i in range(11, -1, -1):
        end = now - timedelta(days=i * 30)
        start = end - timedelta(days=29)
        act = get_activity_for_period(start.strftime("%Y-%m-%d"), end.strftime("%Y-%m-%d"))
        history["kanji"]["month"].append({"label": end.strftime("%b"), "levels": {str(k): v for k, v in act["kanji"].items()}})
        history["box"]["month"].append({"label": end.strftime("%b"), "levels": {str(k): v for k, v in act["box"].items()}})
    # Year
    years = sorted(list(set(d[:4] for d in sessions_by_date.keys())))
    if not years:
        years = [str(now.year)]
    for y in years:
        act = get_activity_for_period(f"{y}-01-01", f"{y}-12-31")
        history["kanji"]["year"].append({"label": y, "levels": {str(k): v for k, v in act["kanji"].items()}})
        history["box"]["year"].append({"label": y, "levels": {str(k): v for k, v in act["box"].items()}})

    available_dates = sorted(list(box_times_by_date.keys()), reverse=True)
    # Sort each date's boxes by master BOX_ORDER
    sorted_box_times_by_date = {}
    for d_key, b_map in box_times_by_date.items():
        sorted_keys = sorted(b_map.keys(), key=get_box_sort_index)
        sorted_box_times_by_date[d_key] = {k: b_map[k] for k in sorted_keys}

    pb_summary = {}
    for b_key, pb in box_pb.items():
        pb_summary[b_key] = {
            "cold_pb_ms": pb["pb_cold_perfect_ms"] or pb["pb_cold_ms"],
            "best_pb_ms": pb["pb_best_perfect_ms"] or pb["pb_best_ms"]
        }

    return {
        "srs_levels": {str(k): v for k, v in srs_levels.items()},
        "daily_stats": daily_stats,
        "kanjis": [],
        "history": history,
        "summaries": summaries,
        "box_times": {
            "available_dates": available_dates,
            "by_date": sorted_box_times_by_date,
            "pb": pb_summary
        }
    }
