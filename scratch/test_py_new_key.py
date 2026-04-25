import os
from supabase import create_client, Client

url = "https://wbeoqdtafvyscmncalzc.supabase.co"
key = "sb_publishable_iC-YvVQj6Oaqz0nEUX2POA_1eFL7uqC"

try:
    supabase: Client = create_client(url, key)
    res = supabase.table('kanji').select("*").limit(1).execute()
    print(f"Success: {res.data}")
except Exception as e:
    print(f"Error: {e}")
