from fastapi import APIRouter
import random, uuid
from backend.core.logging import log_event

router = APIRouter()

# On ne charge plus de fichiers CSV ici.
# On va utiliser le cache global défini dans main.py
# Pour y accéder, on l'importera dynamiquement ou on utilisera une fonction

@router.get("/quiz_compose")
def quiz_compose():
    from backend.main import KANJI_CACHE  # Import local pour éviter les imports circulaires
    
    if not KANJI_CACHE:
        return {"error": "Le cache des kanjis est vide"}

    # Filtrer les kanjis qui ont des mots composés
    # (Assure-toi que ta table Supabase contient bien une colonne 'liste_de_mots' dans le JSON 'data')
    pool_compose = [k for k, v in KANJI_CACHE.items() if v.get("liste_de_mots")]
    
    if not pool_compose:
        return {"error": "Aucune donnée de composition trouvée dans Supabase"}

    kanji = random.choice(pool_compose)
    k_data = KANJI_CACHE[kanji]

    # Extraction des mots corrects
    mots_corrects = [
        w.strip() 
        for w in k_data.get("liste_de_mots", "").split(",") 
        if w.strip()
    ]

    # Création des leurres à partir des autres kanjis du cache
    tous_les_mots = []
    for data in KANJI_CACHE.values():
        mots = data.get("liste_de_mots", "").split(",")
        tous_les_mots.extend([m.strip() for m in mots if m.strip()])
    
    leurres = list(set(tous_les_mots) - set(mots_corrects))
    random.shuffle(leurres)
    options = mots_corrects + leurres[:max(0, 6 - len(mots_corrects))]
    random.shuffle(options)

    qid = str(uuid.uuid4())
    # Note: Dans une version Cloud, on devrait stocker qid dans Redis ou une DB, 
    # mais pour l'instant, gardons le dictionnaire global (attention au redémarrage serveur)
    from backend.api.quiz_compose import COMPOSE_SESSIONS
    COMPOSE_SESSIONS[qid] = {
        "kanji": kanji,
        "correct": set(mots_corrects)
    }

    return {
        "qid": qid,
        "kanji": kanji,
        "signification": k_data.get("signification", ""),
        "options": options
    }

# Garde le reste du fichier (validate) tel quel, 
# mais assure-toi que COMPOSE_SESSIONS est défini au niveau du module
COMPOSE_SESSIONS = {}