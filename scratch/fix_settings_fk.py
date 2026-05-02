from backend.core.config import supabase
import sys

def main():
    print("Checking if '_settings_' exists in 'kanji' table...")
    try:
        # We need to know what columns are in 'kanji' table.
        # Assuming 'kanji' is the primary key or unique column.
        row = {
            "kanji": "_settings_",
            "data": {}
        }
        res = supabase.table('kanji').upsert(row, on_conflict="kanji").execute()
        print("✅ SUCCESS: Added '_settings_' to kanji table.")
        print(res.data)
    except Exception as e:
        print(f"❌ ERROR: {e}")
        
        # If it fails due to missing columns, let's try to see the columns
        try:
            sample = supabase.table('kanji').select("*").limit(1).execute()
            if sample.data:
                print("Sample columns:", sample.data[0].keys())
        except:
            pass

if __name__ == "__main__":
    main()
