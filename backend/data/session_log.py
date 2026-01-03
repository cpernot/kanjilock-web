from backend.core.config import supabase
from datetime import datetime

def log_session(payload: dict):
    """
    Envoie les détails de la session vers la table 'sessions' de Supabase
    """
    try:
        # On prépare l'objet pour la colonne JSONB 'details'
        # On s'assure qu'il y a un timestamp pour le classement
        if "timestamp" not in payload:
            payload["timestamp"] = datetime.now().isoformat()

        data_to_insert = {
            "details": payload
            # session_date sera rempli automatiquement par Supabase (Default: now())
        }

        # Insertion dans Supabase
        response = supabase.table("sessions").insert(data_to_insert).execute()
        
        print(f"✅ Session sauvegardée sur Supabase (ID: {response.data[0]['id']})")
        return True

    except Exception as e:
        print(f"❌ Erreur lors du log de session : {e}")
        return False