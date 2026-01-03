import os
import json
from backend.core.config import PROGRESS_FILE 
from backend.core.config import supabase

from backend.core.config import supabase

def load_data(user_id: str):
    """
    Récupère la progression et reconstruit la structure dictionnaire
    pour que le reste du code ne soit pas perturbé.
    """
    try:
        # # 1. On récupère toutes les lignes de cet utilisateur
        # response = supabase.table("progress").select("*").eq("user_id", user_id).execute()
        # rows = response.data

        # # 2. On reconstruit le format { "srs": { "qd": { "物": {...} } } }
        # # pour correspondre à ton ancien format de fichier
        # nested_data = {"srs": {}}
        
        # for row in rows:
        #     mode = row["mode"]
        #     kanji = row["kanji"]
        #     stats = row["stats"]
            
        #     if mode not in nested_data["srs"]:
        #         nested_data["srs"][mode] = {}
            
        #     nested_data["srs"][mode][kanji] = stats
            
        # return nested_data
        res = supabase.table("progress").select("*").eq("user_id", user_id).execute()        
        structured_data = {"srs": {}, "daily_stats": {}}
        for row in res.data:
            mode = row["mode"]
            kanji = row["kanji"]
            stats = row["stats"]
            # On reconstruit le dictionnaire attendu par stats.py
            if mode not in structured_data["srs"]:
                structured_data["srs"][mode] = {}
            structured_data["srs"][mode][kanji] = stats
        
        # Note: Si tu as une table séparée pour daily_stats, il faudra un autre select ici
        return structured_data

    except Exception as e:
        print(f"❌ Erreur load_data: {e}")
        return {"srs": {}}

def save_data(user_id, data):
    from backend.core.config import supabase
    
    # On prépare les lignes à mettre à jour
    rows = []
    srs_data = data.get("srs", {})
    
    for mode, kanjis in srs_data.items():
        for kanji, stats in kanjis.items():
            rows.append({
                "user_id": user_id,
                "kanji": kanji,
                "mode": mode,
                "stats": stats
            })
    
    # Supabase fait un "Upsert" : il met à jour seulement ce qui a changé
    if rows:
        supabase.table("progress").upsert(rows, on_conflict="user_id,kanji,mode").execute()

def load_data_old():
    if not os.path.exists(PROGRESS_FILE):
        return {}
    with open(PROGRESS_FILE, "r", encoding="utf-8") as f:
        return json.load(f)
    
    
def save_data_old(data):
    with open(PROGRESS_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def get_user(data, user_id):
    return data.setdefault(user_id, {
        "srs": {},
        "daily_stats": {}
    })
def get_user_srs(user, mode):
    return user["srs"].setdefault(mode, {})

