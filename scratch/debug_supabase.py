import os
import asyncio
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

async def test_fetch():
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_KEY")
    print(f"Connecting to {url}...")
    
    try:
        supabase = create_client(url, key)
        print("Client created. Fetching kanji...")
        
        # Test just the first page
        res = supabase.table('kanji').select("*").limit(5).execute()
        print(f"Success! Fetched {len(res.data)} kanji.")
        for r in res.data:
            print(f" - {r.get('kanji')}")
            
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    # We need to install supabase first, but I'll try to run it directly if it's in the environment
    # Actually, I'll just use a direct requests approach if supabase lib is missing
    try:
        import supabase
        asyncio.run(test_fetch())
    except ImportError:
        print("Supabase library not found. Testing via requests...")
        import requests
        headers = {
            "apikey": key,
            "Authorization": f"Bearer {key}"
        }
        res = requests.get(f"{url}/rest/v1/kanji?select=*&limit=5", headers=headers)
        if res.status_code == 200:
            print(f"Success via REST! Data: {res.json()}")
        else:
            print(f"❌ REST Error {res.status_code}: {res.text}")
