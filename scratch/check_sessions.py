import os
from supabase import create_client, Client
from dotenv import load_dotenv
import json

load_dotenv()

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(url, key)

player = "cyril"
res = supabase.table('sessions').select("*").eq("details->>player", player).limit(5).execute()

print(f"Sessions for {player}:")
print(json.dumps(res.data, indent=2))
