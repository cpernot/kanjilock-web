from datetime import datetime
from backend.core.config import supabase

# def log_event(event: dict):
#     """
#     Enregistre un événement (ex: clic, affichage de question) dans Supabase.
#     """
#     try:
#         # On ajoute le timestamp au dictionnaire
#         event["ts"] = datetime.now().isoformat()

#         # On prépare l'insertion
#         # On utilise .insert().execute() 
#         # Note : Pour les logs massifs, on pourrait ne pas attendre la réponse
#         supabase.table("logs").insert({"event_data": event}).execute()
        
#     except Exception as e:
#         # On ne veut pas que l'app plante si les logs ne passent pas
#         print(f"⚠️ LOG ERROR (Non-critique): {e}")

import threading

def log_event(event: dict):
    # On lance la sauvegarde dans un fil séparé
    threading.Thread(target=_send_to_supabase, args=(event,)).start()

def _send_to_supabase(event):
    try:
        event["ts"] = datetime.now().isoformat()
        supabase.table("logs").insert({"event_data": event}).execute()
    except:
        pass # Discret en cas d'erreur