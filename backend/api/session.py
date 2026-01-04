# backend/api/session.py
from fastapi import APIRouter
from backend.data.session_log import log_session
from backend.data.progress import load_data, save_data
from backend.core.srs import update_kanji_srs
from backend.core.config import USER_ID # Ou récupérer dynamiquement depuis payload['player']

router = APIRouter()

@router.post("/session")
async def save_session(payload: dict):
    # 1. On log la session comme avant (pour les stats globales)
    log_session(payload)
    
    # 2. On récupère l'historique des réponses
    answers = payload.get("answers", [])
    if not answers:
        return {"status": "ok", "message": "No answers to process"}

    # 3. Chargement de la progression utilisateur (Supabase/JSON)
    user_data = load_data(USER_ID)
    srs_data = user_data.setdefault("srs", {})

    # 4. Traitement de chaque réponse
    for ans in answers:
        kanji = ans.get("kanji")
        mode = ans.get("mode", "qa")
        correct = ans.get("correct")
        speed_factor = ans.get("speed_factor", 1.0)

        if not kanji:
            continue

        # Initialisation du dictionnaire pour ce mode si inexistant
        if mode not in srs_data:
            srs_data[mode] = {}
        
        # Récupération de l'état actuel du kanji ou état par défaut (Level 1)
        state = srs_data[mode].get(kanji, {"level": 1, "next_review": None})

        # Utilisation de ta fonction SRS existante pour modifier 'state' en place
        update_kanji_srs(state, correct, speed_factor)

        # Sauvegarde du nouvel état
        srs_data[mode][kanji] = state

    # 5. Sauvegarde finale (Une seule écriture pour toute la session !)
    save_data(USER_ID, user_data)

    return {"status": "success", "updated_kanjis": len(answers)}