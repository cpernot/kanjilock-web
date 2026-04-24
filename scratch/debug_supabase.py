import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")
supabase = create_client(url, key)

try:
    print("Checking 'kanji_mot' table...")
    res = supabase.table("kanji_mot").select("*").limit(5).execute()
    print(f"Count: {len(res.data)}")
    if res.data:
        print(f"Sample row: {res.data[0]}")
    else:
        print("Table is empty.")
except Exception as e:
    print(f"Error checking 'kanji_mot': {e}")

try:
    print("\nChecking 'kanji' table sample...")
    res = supabase.table("kanji").select("kanji, data").limit(1).execute()
    if res.data:
        print(f"Sample kanji: {res.data[0]['kanji']}")
        print(f"Sample data keys: {list(res.data[0]['data'].keys())}")
except Exception as e:
    print(f"Error checking 'kanji': {e}")
