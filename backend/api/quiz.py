import random, uuid
from datetime import date, datetime
from fastapi import APIRouter, Request, HTTPException

from backend.data.progress import load_data, save_data
from backend.core.selection import choose_weighted_kanji
from backend.core.logging import log_event
# On n'importe plus load_kanjilock qui lit un fichier, on va utiliser le cache
from backend.api.quiz_modes import quiz_intrus
from backend.core.config import  QUIZ_SESSIONS, QUIZ_MODES #USER_ID,
from datetime import datetime, timedelta

router = APIRouter()

def is_kanji_valid(k, mode_def):
    if "is_valid" in mode_def:
        return mode_def["is_valid"](k)
    return True

@router.get("/quiz")
def quiz_api(request: Request, mode: str = "qa", player: str = "Anonymous", box: str = None):
    # 1. Utilisation du Cache global (évite l'appel réseau lourd)
    kanji_cache = getattr(request.app.state, "kanji_cache", {})
    
    if not kanji_cache:
        raise HTTPException(status_code=503, detail="Le cache des kanjis est en cours de chargement")

    today = date.today().isoformat()
    
    # 2. Chargement de la progression (Appel Supabase optimisé via load_data)
    # On ne charge QUE les données de l'utilisateur concerné
    data = load_data(player)
    
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
            "answer": payload["answer"],  # ADD THIS
            "mode": "intrus"
        }

    # =========================
    # 3️⃣ QUIZ NORMAL
    # =========================
    mode_def = QUIZ_MODES[mode]
    
    # Filtrage des kanjis valides (sur le cache en mémoire, donc instantané)
    filtered_kanjis = {}
    for k_char, k_data in kanji_cache.items():
        # Check mode validity
        if not is_kanji_valid(k_data, mode_def):
            continue
        
        # Check box filter if specified (box is a string like "1", "2A", etc.)
        if box and box != "" and box != "all":
            if str(k_data.get("boite")) != str(box):
                continue
                
        filtered_kanjis[k_char] = k_data

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
        save_data(player, {"srs": {mode: {kanji: srs[kanji]}}})
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
    log_event({"event": "quiz_shown", "user": player, "kanji": kanji, "mode": mode})

    return {
        "qid": qid,
        "question": question,
        "options": options,
        "mode": mode
    }

@router.get("/quiz/init")
def sync_init(request: Request, player: str):
    # Ensure we get the app state correctly
    kanji_cache = getattr(request.app.state, "kanji_cache", {})
    
    # Log to server console for debugging
    print(f"📡 sync_init: Player={player}, CacheSize={len(kanji_cache)}")
    
    user_data = load_data(player) 
    
    from fastapi.responses import JSONResponse
    return JSONResponse(
        content={
            "static_data": kanji_cache,
            "user_progress": user_data.get("srs", {}),
            "server_time": datetime.now().isoformat()
        },
        headers={"Cache-Control": "no-store, no-cache, must-revalidate"}
    )

def calculate_kanji_level(stats):
    """
    stats = {
        'attempts': int,
        'success_rate': float,
        'best_time_ms': int, # max response time in your case
        'last_attempt_date': datetime
    }
    """
    # Level 1: Quiz done at least once
    if stats['attempts'] < 1:
        return 0    
    level = 1    
    # Level 2: Quiz achieved without any miss (100% success)
    if stats['success_rate'] >= 100:
        level = 2        
        # Level 3: No miss + within 14 seconds (14000ms)
        # Note: 'best_time' should be the slowest response in that perfect session
        if stats['best_time_ms'] <= 14000:
            level = 3            
            # Level 4: Level 3 achieved after 5 days without attempt
            five_days_ago = datetime.now() - timedelta(days=5)
            if stats['last_attempt_date'] <= five_days_ago:
                level = 4                
    return level    