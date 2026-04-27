import os
import json
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
            
            if kanji == "_settings_":
                continue

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

def get_user(data, user_id):
    return data.setdefault(user_id, {
        "srs": {},
        "daily_stats": {}
    })
def get_user_srs(user, mode):
    return user["srs"].setdefault(mode, {})

def get_player_settings(user_id: str):
    try:
        res = supabase.table("progress").select("stats").eq("user_id", user_id).eq("kanji", "_settings_").execute()
        if res.data:
            return res.data[0]["stats"]
        return None
    except Exception as e:
        print(f"❌ Error get_player_settings: {e}")
        return None

def save_player_settings(user_id: str, settings: dict):
    try:
        row = {
            "user_id": user_id,
            "kanji": "_settings_",
            "mode": "global",
            "stats": settings
        }
        supabase.table("progress").upsert(row, on_conflict="user_id,kanji,mode").execute()
        return True
    except Exception as e:
        print(f"❌ Error save_player_settings: {e}")
        return False

