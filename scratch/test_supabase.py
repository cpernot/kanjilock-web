import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")

if not url or not key:
    print("❌ Missing Supabase credentials in .env")
    exit(1)

try:
    supabase = create_client(url, key)
    # Try to fetch just one row from 'kanji'
    res = supabase.table('kanji').select("*").limit(1).execute()
    print(f"✅ Connection successful! Found {len(res.data)} kanji.")
    if len(res.data) > 0:
        print(f"Sample data: {res.data[0].get('kanji')}")
    else:
        print("⚠️ Table 'kanji' is empty.")
except Exception as e:
    print(f"❌ Connection failed: {e}")
