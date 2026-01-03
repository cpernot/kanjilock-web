import random, uuid
from datetime import date
from fastapi import APIRouter, Request, HTTPException

from backend.data.progress import load_data, save_data
from backend.core.selection import choose_weighted_kanji
from backend.core.logging import log_event
# On n'importe plus load_kanjilock qui lit un fichier, on va utiliser le cache
from backend.api.quiz_modes import quiz_intrus
from backend.core.config import USER_ID, QUIZ_SESSIONS, QUIZ_MODES

router = APIRouter()

def is_kanji_valid(k, mode_def):
    if "is_valid" in mode_def:
        return mode_def["is_valid"](k)
    return True

@router.get("/quiz")
def quiz_api(request: Request, mode: str = "qa"):
    # 1. Utilisation du Cache global (évite l'appel réseau lourd)
    kanji_cache = getattr(request.app.state, "kanji_cache", {})
    
    if not kanji_cache:
        raise HTTPException(status_code=503, detail="Le cache des kanjis est en cours de chargement")

    today = date.today().isoformat()
    
    # 2. Chargement de la progression (Appel Supabase optimisé via load_data)
    # On ne charge QUE les données de l'utilisateur concerné
    data = load_data(USER_ID)
    
    # Structure de données pour la compatibilité avec ton code existant
    user = data.get("srs", {}) # load_data renvoie déjà {"srs": {...}}
    
    # Initialisation si vide (pour le premier quiz)
    if mode not in user:
        user[mode] = {}
    srs = user[mode]

    # =========================
    # 🕵️ MODE INTRUS
    # =========================
    if mode == "intrus":
        # On utilise "qa" par défaut pour les stats de l'intrus
        user_srs_intrus = user.get("qa", {})
        payload = quiz_intrus(kanji_cache, user_srs_intrus, show_box=True)

        if not payload:
            return {"error": "Pas assez de données"}

        qid = str(uuid.uuid4())
        QUIZ_SESSIONS[qid] = {
            "mode": "intrus",
            "answer": payload["answer"],
            "options": payload["options"], 
            "source": "intrus"
        }
        
        return {
            "qid": qid,
            "question": payload["question"],
            "options": payload["options"],
            "mode": "intrus"
        }

    # =========================
    # 3️⃣ QUIZ NORMAL
    # =========================
    mode_def = QUIZ_MODES[mode]
    
    # Filtrage des kanjis valides (sur le cache en mémoire, donc instantané)
    filtered_kanjis = {
        k_char: k_data for k_char, k_data in kanji_cache.items() 
        if is_kanji_valid(k_data, mode_def)
    }

    all_kanji_keys = set(filtered_kanjis.keys())
    seen_keys = set(srs.keys())
    new_keys = list(all_kanji_keys - seen_keys)

    kanji = None
    source = None

    # Sélection intelligente
    if (k := choose_weighted_kanji(srs, filtered_kanjis, today)):
        kanji = k
        source = "review"
    elif new_keys:
        kanji = random.choice(new_keys)
        # On initialise le nouveau kanji dans le dictionnaire local
        srs[kanji] = {"level": 1, "next_review": today}
        source = "new"
        # ⚡ OPTIMISATION : On sauvegarde immédiatement ce nouveau kanji
        save_data(USER_ID, {"srs": {mode: {kanji: srs[kanji]}}})
    else:
        return {"done": True}

    # Préparation de la question
    k_info = filtered_kanjis[kanji]
    question = mode_def["question"](kanji, k_info)
    answer = mode_def["answer"](kanji, k_info)
    
    # Génération des mauvaises réponses
    autres = [
        mode_def["answer"](k2, v2)
        for k2, v2 in filtered_kanjis.items()
        if k2 != kanji
    ]
    wrong = random.sample(autres, min(3, len(autres)))
    options = wrong + [answer]
    random.shuffle(options)
    extras = mode_def["extras"](kanji, k_info)

    # Stockage de la session en mémoire vive
    qid = str(uuid.uuid4())
    QUIZ_SESSIONS[qid] = {
        "mode": mode,
        "kanji": kanji,
        "answer": answer,
        "options": options,
        "extras": extras,
        "source": source
    }

    # Log asynchrone (optionnel)
    log_event({"event": "quiz_shown", "user": USER_ID, "kanji": kanji, "mode": mode})

    return {
        "qid": qid,
        "question": question,
        "options": options,
        "mode": mode
    }