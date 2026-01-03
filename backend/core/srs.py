
from datetime import date, timedelta,datetime 
from backend.core.config import SRS_INTERVALS
def compute_next_review(state, response_time):
    base_delay = timedelta(days=2 ** state["level"])
    if response_time < 3:
        coef = 1.2
    elif response_time < 5:
        coef = 1.0
    else:
        coef = 0.6
    return base_delay * coef

def update_kanji_srs(state, correct, speed_factor=1.0):
    now = datetime.now()
    if correct:
        state["level"] = min(state["level"] + 1, 4)
        base_days = SRS_INTERVALS[state["level"]]
        adjusted_delay = base_days / speed_factor
        state["next_review"] = (date.today() + adjusted_delay).isoformat()
        # state["next_review"] = (date.today() + timedelta(days=adjusted_days)).isoformat()
        # state["level"] = min(state["level"] + 1, 4)
        # level = state["level"]
        # base_days = SRS_INTERVALS[min(level, len(SRS_INTERVALS) - 1)]
        # adjusted_days = base_days #int(base_days / speed_factor)
        # state["next_review"] = (date.today() + timedelta(days=adjusted_days)).isoformat()
        #state["next_review"] = (now + timedelta(days=state["level"])).isoformat()
        #-------------------251231---------------------------------------------------------
    else:
        state["level"] = max(state["level"] - 1, 1)
        # ⛔ cooldown immédiat (ex : 10 minutes)
        state["next_review"] = (now + timedelta(minutes=10)).isoformat()
    
def is_available(state, now):
    return state.get("retry_after", "1970-01-01") <= now
