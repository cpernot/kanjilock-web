import random
from datetime import datetime
from backend.core.srs import is_available
from backend.core.config import WEIGHTS
from backend.core.logging import log_event
now = datetime.now().isoformat()

def choose_weighted_kanji(srs, kanjis, today):
    now = datetime.now()
    pool = []
    for kanji, state in srs.items():
        log_event({
    "event": "kanji_selected",
    "kanji": kanji,
    "next_review": state["next_review"],
    "now": datetime.now().isoformat(),
    "level": state["level"]
})
        if kanji not in kanjis:
            continue
        next_review = datetime.fromisoformat(state["next_review"])
        if next_review > now:
            continue  # ⛔ pas encore dispo
        level = state["level"]
        weight = WEIGHTS.get(level, 1)
        pool.extend([kanji] * int(weight * 10))
    return random.choice(pool) if pool else None
