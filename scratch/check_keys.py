import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")
supabase = create_client(url, key)

res1 = supabase.table('kanji').select("kanji").limit(5).execute()
print("kanji table keys:", [r['kanji'] for r in res1.data])

res2 = supabase.table('kanji_mot').select("*").limit(5).execute()
print("kanji_mot table items:", res2.data)
