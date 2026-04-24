import os
import json
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")
supabase = create_client(url, key)

res = supabase.table('kanji_mot').select("*").limit(3).execute()
with open("kanji_mot_sample.json", "w", encoding="utf-8") as f:
    json.dump(res.data, f, ensure_ascii=False, indent=2)
