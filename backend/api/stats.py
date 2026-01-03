from backend.data.progress import load_data
from backend.core.config import USER_ID
from fastapi import APIRouter

router = APIRouter()

@router.get("/api/stats")
def stats_api(mode: str = "qa"):
    # 1. On importe le cache depuis main pour éviter de relire le fichier JSON
    from backend.main import KANJI_CACHE as kanjis
    
    # 2. On charge la progression depuis Supabase via load_data (avec l'ID !)
    # load_data(USER_ID) renvoie déjà {"srs": {...}, "daily_stats": {...}}
    data = load_data(USER_ID)

    if not data:
        return {"srs_levels": {1: 0, 2: 0, 3: 0, 4: 0}, "kanjis": []}

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
        k_info = kanjis.get(k_char, {})
        
        kanji_entry = {
            "kanji": k_char,
            "level": v_stats.get("level"),
            "next_review": v_stats.get("next_review"),
        }
        # On fusionne avec les infos du dictionnaire kanjilock
        kanji_entry.update(k_info)
        kanji_list.append(kanji_entry)

    return {
        "srs_levels": srs_levels,
        "daily_stats": data.get("daily_stats", {}),
        "kanjis": kanji_list
    }