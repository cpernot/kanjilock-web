import os
import json
import csv
from dotenv import load_dotenv
from supabase import create_client, Client

# 1. Configuration
load_dotenv()
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")

print(f"DEBUG - URL lue : {url}")
# On affiche juste les 5 premiers caractères de la clé pour vérifier
print(f"DEBUG - Clé lue : {key[:5] if key else 'RIEN DU TOUT'}")

if not url or not key:
    print("ERREUR: Vérifie ton fichier .env")
    exit()

supabase: Client = create_client(url, key)

def migrate_kanji():
    print("--- Migration des Kanjis ---")
    try:
        # Adapter le chemin si nécessaire
        with open('main_data/kanjilock.json', 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        # On prépare une liste pour l'envoi en masse
        rows_to_insert = []
        
        # NOTE: Je suppose que ton json est un dictionnaire { "字": {data}, "日": {data} }
        # Si c'est une liste, adapter la boucle.
        if isinstance(data, dict):
            for kanji_char, details in data.items():
                rows_to_insert.append({
                    "kanji": kanji_char,
                    "data": details
                })
        elif isinstance(data, list):
             # Si ton json est déjà une liste d'objets
             for item in data:
                 # Change 'kanji' par la clé qui contient le caractère dans ton fichier
                 rows_to_insert.append({
                     "kanji": item.get('kanji') or item.get('character'), 
                     "data": item
                 })

        # Insertion par lot (chunk) de 100 pour éviter de surcharger
        chunk_size = 100
        for i in range(0, len(rows_to_insert), chunk_size):
            chunk = rows_to_insert[i:i+chunk_size]
            response = supabase.table('kanji').upsert(chunk).execute()
            print(f"Lot {i} à {i+len(chunk)} inséré.")
            
        print("✅ Kanjis terminés.")

    except FileNotFoundError:
        print("❌ Fichier kanjilock.json introuvable.")
    except Exception as e:
        print(f"❌ Erreur: {e}")
def migrate_progress():
    print("\n--- Migration de la Progression (Complexe) ---")
    try:
        with open('main_data/progress.json', 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        rows = []
        
        # 1. On parcourt les User IDs (ex: "144928...")
        for user_id, user_content in data.items():
            srs_data = user_content.get("srs", {})
            
            # 2. On parcourt les Modes (ex: "qd")
            for mode, kanji_list in srs_data.items():
                
                # 3. On parcourt les Kanjis (ex: "物")
                for kanji_char, stats in kanji_list.items():
                    rows.append({
                        "user_id": user_id,
                        "kanji": kanji_char,
                        "mode": mode,  # On sauvegarde que c'est le mode "qd"
                        "stats": stats # {"level": 3, "next_review": ...}
                    })

        if rows:
            # Insertion par lot de 100
            chunk_size = 100
            for i in range(0, len(rows), chunk_size):
                supabase.table('progress').insert(rows[i:i+chunk_size]).execute()
            print(f"✅ {len(rows)} entrées de progression insérées.")
        else:
            print("⚠️ Aucune donnée trouvée.")

    except FileNotFoundError:
        print("⚠️ Pas de fichier progress.json.")
    except Exception as e:
        print(f"❌ Erreur sur progress: {e}")

def migrate_sessions():
    print("\n--- Migration des Sessions (JSONL) ---")
    rows = []
    try:
        with open('main_data/sessions.jsonl', 'r', encoding='utf-8') as f:
            for line in f:
                if line.strip(): # Ignorer les lignes vides
                    session_data = json.loads(line)
                    rows.append({
                        "details": session_data,
                        # Si tu as une date dans le jsonl, extrais-la, sinon laisse Supabase mettre la date actuelle
                        # "session_date": session_data.get('timestamp') 
                    })
        
        if rows:
            chunk_size = 50
            for i in range(0, len(rows), chunk_size):
                supabase.table('sessions').insert(rows[i:i+chunk_size]).execute()
            print(f"✅ {len(rows)} sessions archivées.")

    except FileNotFoundError:
        print("⚠️ Pas de fichier sessions.jsonl.")

def migrate_csv_keywords():
    print("\n--- Migration des Mots CSV ---")
    try:
        updates_count = 0
        with open('main_data/liste_de_mots.csv', 'r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f) # Lit les entêtes "kanji" et "liste_de_mots" automatiquement
            
            for row in reader:
                kanji_char = row['kanji']
                raw_words = row['liste_de_mots'] # ex: "correspondre,tampon"
                
                # On transforme la string en vraie liste ["correspondre", "tampon"]
                words_list = [w.strip() for w  in raw_words.split(',') if w.strip()]
         
                # OPTION 1 (La plus sûre) : On récupère l'existant, on fusionne, on renvoie.
                # Cela évite d'écraser les strokes/meanings importés depuis kanjilock.json
                
                # 1. Récupérer les données actuelles du kanji sur Supabase
                res = supabase.table('kanji').select('data').eq('kanji', kanji_char).execute()
                
                if res.data:
                    current_data = res.data[0]['data'] # Le JSON actuel
                    if current_data is None: current_data = {}
                    
                    # 2. Ajouter nos mots clés
                    current_data['custom_keywords'] = words_list
                    
                    # 3. Mettre à jour Supabase
                    supabase.table('kanji').update({'data': current_data}).eq('kanji', kanji_char).execute()
                    updates_count += 1
                    
                    if updates_count % 50 == 0:
                        print(f"En cours... {updates_count} kanjis mis à jour.")

        print(f"✅ CSV Terminé : {updates_count} kanjis enrichis avec les mots clés.")

    except FileNotFoundError:
        print("⚠️ Pas de fichier liste_de_mots.csv.")
    except Exception as e:
        print(f"❌ Erreur CSV: {e}")

if __name__ == "__main__":
    # migrate_kanji()
    # migrate_sessions()
    # migrate_progress()
    migrate_csv_keywords()
    
    print("\n🎉 MIGRATION TERMINÉE !")