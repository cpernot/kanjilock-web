import json
from backend.core.config import DATA_DIR
from fastapi import APIRouter
from backend.data.session_log import log_session

router = APIRouter()

@router.post("/session")
def save_session(payload: dict):
    """
    Reçoit une session complète depuis le frontend
    """
    print(f"save_session PAYLOAD started for : {payload}")

    required = {
        "player",
        "mode",
        "session_size",
        "correct",
        "wrong",
        "total_time_ms",
        "score_speed",
        "score_global",
    }

    if not required.issubset(payload):
        print("error missing fields")
        return {"error": "missing fields"}

    log_session(payload)
    print("save_session PAYLOAD:", payload)
    return {"status": "ok"}

# @router.post("/session")
# def save_session(payload: dict):
#     with open(DATA_DIR / "sessions.jsonl", "a", encoding="utf-8") as f:
#         f.write(json.dumps(payload) + "\n")
#     return {"status": "ok"}

