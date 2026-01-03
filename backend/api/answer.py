from datetime import date, datetime
from backend.data.progress import load_data, save_data
from backend.core.logging import log_event
from backend.core.srs import update_kanji_srs
from backend.core.config import QUIZ_SESSIONS, USER_ID

from fastapi import APIRouter

router = APIRouter()

@router.post("/answer")
def answer(payload: dict):   
    qid = payload.get("qid")
    choice = payload.get("choice")
    rt_ms = payload.get("rt_ms")
    speed_factor = payload.get("speed_factor", 1.0)

    # Récupération de la session en RAM (instantané)
    session = QUIZ_SESSIONS.pop(qid, None)
    if not session:
        return {"error": "session expirée"}

    correct = choice == session["answer"]
    mode = session["mode"]
    kanji = session.get("kanji")

    response = {
        "correct": correct,
        "mode": mode,
        "bonne": session["answer"],
        "extras": session.get("extras", {}),
        "rt_ms": rt_ms
    }

    # =========================
    # MISE À JOUR SRS & STATS
    # =========================
    if mode != "intrus" and kanji:
        # 1. On charge uniquement les données nécessaires
        data = load_data(USER_ID)
        
        # Structure compatible avec tes fonctions SRS existantes
        # load_data renvoie {"srs": {mode: {kanji: stats}}}
        srs_root = data.get("srs", {})
        mode_data = srs_root.get(mode, {})
        state = mode_data.get(kanji)

        if state:
            # 2. Calcul du nouveau niveau SRS (en local, rapide)
            update_kanji_srs(state, correct, speed_factor)

            # 3. Mise à jour des stats quotidiennes 
            # (Note: Tu pourrais créer une table 'daily_stats' sur Supabase plus tard 
            # pour éviter de stocker ça dans un gros JSON)
            today = date.today().isoformat()
            daily_stats = data.setdefault("daily_stats", {})
            today_stats = daily_stats.setdefault(today, {"1": 0, "2": 0, "3": 0, "4": 0})
            
            lvl_str = str(state["level"])
            if lvl_str in today_stats:
                today_stats[lvl_str] += 1

            # 4. Sauvegarde CIBLÉE
            # On ne renvoie pas tout, on utilise l'UPSERT sur la ligne précise
            save_data(USER_ID, data)

    # =========================
    # LOG (Supabase gère l'écriture asynchrone très bien)
    # =========================
    log_event({
        "event": "answer",
        "user": USER_ID,
        "kanji": kanji,
        "mode": mode,
        "correct": correct,
        "rt_ms": rt_ms,
        "ts": datetime.now().isoformat()
    })

    return response