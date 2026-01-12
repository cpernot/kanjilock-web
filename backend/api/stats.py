from backend.data.progress import load_data
from backend.data.session_stats import load_sessions 
# from backend.core.config import USER_ID
from fastapi import APIRouter, Request

router = APIRouter()

@router.get("/stats")
def stats_api(request: Request, mode: str = "qa", player: str = "Anonymous"):
    # 1. On importe le cache depuis main pour éviter de relire le fichier JSON
    kanji_cache = getattr(request.app.state, "kanji_cache", {})
    
    # 2. On charge la progression depuis Supabase via load_data (avec l'ID !)
    # load_data(USER_ID) renvoie déjà {"srs": {...}, "daily_stats": {...}}
    data = load_data(player)

    if not data:
        return {"srs_levels": {1: 0, 2: 0, 3: 0, 4: 0}, "kanjis": []}
    # NOUVEAU : Calcul des stats journalières à partir des sessions--------------------------------------------
    all_sessions = load_sessions()
    daily_stats = {}
    for s in all_sessions:
        # On vérifie que la session appartient au joueur (si tu as une colonne user/player)
        # s.get("player") == player ...
        
        # Récupération de la date (YYYY-MM-DD)
        # Si session_date est déjà "2024-05-20", on le prend tel quel
        d_str = s.get("session_date") 
        if not d_str: continue
        
        # On extrait juste la partie date si c'est un timestamp complet
        date_key = d_str.split("T")[0] 
        print("Date clé extraite:", date_key)
        # On compte le nombre de réponses dans cette session
        # Supposons que 'details' contient la liste des réponses
        details = s.get("details", [])
        count = len(details) if isinstance(details, list) else 1
        
        if date_key not in daily_stats:
            daily_stats[date_key] = 0
        daily_stats[date_key] += count

    # 3. Extraction des données SRS pour le mode choisi
    # La structure de data est maintenant simplifiée par load_data
    srs_all_modes = data.get("srs", {})
    srs = srs_all_modes.get(mode, {})

    # 4. Calcul des niveaux SRS
    srs_levels = {1: 0, 2: 0, 3: 0, 4: 0}
    for v in srs.values():
        lvl = v.get("level", 1)
        if lvl in srs_levels:
            srs_levels[lvl] += 1

    # 5. Construction de la liste détaillée des Kanjis
    kanji_list = []
    for k_char, v_stats in srs.items():
        # On récupère les infos statiques (signification, etc.) dans le cache
        k_info = kanji_cache.get(k_char, {})
        
        kanji_entry = {
            "kanji": k_char,
            "level": v_stats.get("level"),
            "next_review": v_stats.get("next_review"),
        }
        # On fusionne avec les infos du dictionnaire kanjilock
        kanji_entry.update(k_info)
        kanji_list.append(kanji_entry)

    return {
        "srs_levels": {str(k): v for k, v in srs_levels.items()},
        "daily_stats": daily_stats, #"daily_stats": data.get("daily_stats", {}),
        "kanjis": kanji_list
    }