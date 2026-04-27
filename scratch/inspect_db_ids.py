import os
from supabase import create_client, Client
from dotenv import load_dotenv
import json

load_dotenv()

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(url, key)

# Get some rows with IDs
res = supabase.table('kanji').select("id, data->boite").limit(20).execute()
print("First 20 rows (ID and Box):")
for row in res.data:
    print(f"ID: {row['id']}, Box: {row['boite']}")

# Sort all unique boxes by the MINIMUM ID they appear in
res_all = supabase.table('kanji').select("id, data->boite").execute()
box_min_id = {}
for row in res_all.data:
    b = str(row.get('boite'))
    if b == 'None': continue
    bid = row['id']
    if b not in box_min_id or bid < box_min_id[b]:
        box_min_id[b] = bid

# Sort boxes by their minimum ID
sorted_boxes = sorted(box_min_id.keys(), key=lambda x: box_min_id[x])

print("\nBoxes sorted by minimum ID of kanji in that box:")
print(json.dumps(sorted_boxes, indent=2))
