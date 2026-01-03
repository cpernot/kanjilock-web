from fastapi import APIRouter, Request
import random, uuid
from backend.core.logging import log_event

router = APIRouter()

@router.get("/quiz_compose")
def quiz_compose(request: Request): # <--- Ajoute request: Request ici
    # Récupère le cache depuis l'état de l'app sans importer main
    kanji_cache = getattr(request.app.state, "kanji_cache", {})
    
    if not kanji_cache:
        return {"error": "Le cache des kanjis est vide"}

    # Filtrer les kanjis qui ont des mots composés
    # (Assure-toi que ta table Supabase contient bien une colonne 'liste_de_mots' dans le JSON 'data')
    pool_compose = [k for k, v in kanji_cache.items() if v.get("liste_de_mots")]
    
    if not pool_compose:
        return {"error": "Aucune donnée de composition trouvée dans Supabase"}

    kanji = random.choice(pool_compose)
    k_data = kanji_cache[kanji]

    # Extraction des mots corrects
    mots_corrects = [
        w.strip() 
        for w in k_data.get("liste_de_mots", "").split(",") 
        if w.strip()
    ]

    # Création des leurres à partir des autres kanjis du cache
    tous_les_mots = []
    for data in kanji_cache.values():
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