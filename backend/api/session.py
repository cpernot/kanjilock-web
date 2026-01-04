# backend/api/session.py
from fastapi import APIRouter
from backend.data.session_log import log_session
from backend.data.progress import load_data, save_data
from backend.core.srs import update_kanji_srs
from backend.core.config import USER_ID # Ou récupérer dynamiquement depuis payload['player']

router = APIRouter()

@router.post("/session")
def save_session(payload: dict):
    print(f"💾 Fin de session reçue. Traitement SRS...")

    # 1. Log classique (statistiques globales)
    log_session(payload)
    
    # 2. Mise à jour SRS en masse
    answers = payload.get("answers", [])
    if not answers:
        return {"status": "ok", "msg": "No answers to process"}

    # On charge les données UNE SEULE FOIS
    # (Si tu gères plusieurs utilisateurs, utilise payload['player'] ici au lieu de USER_ID)
    player_id = USER_ID 
    data = load_data(player_id)
    srs_root = data.setdefault("srs", {})

    changes_count = 0

    for ans in answers:
        mode = ans.get("mode", "qa")
        kanji = ans.get("kanji")
        correct = ans.get("correct")
        speed = ans.get("speed_factor", 1.0)

        if not kanji: continue

        # Initialisation si le mode ou le kanji n'existe pas
        if mode not in srs_root: srs_root[mode] = {}
        
        # On récupère l'état actuel ou on crée un défaut (Level 1)
        state = srs_root[mode].get(kanji, {"level": 1, "next_review": ""})
        
        # Calcul du nouveau niveau via ta logique existante (backend/core/srs.py)
        # Note: update_kanji_srs modifie l'objet 'state' directement en place (mutable)
        update_kanji_srs(state, correct, speed)
        
        # On remet l'état mis à jour dans le dictionnaire
        srs_root[mode][kanji] = state
        changes_count += 1

    # 3. Sauvegarde UNE SEULE FOIS après la boucle
    if changes_count > 0:
        save_data(player_id, data)
        print(f"✅ {changes_count} kanjis mis à jour pour {player_id}")

    return {"status": "ok", "updated": changes_count}