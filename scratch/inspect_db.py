import os
from supabase import create_client, Client
from dotenv import load_dotenv
import json

load_dotenv()

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(url, key)

# Get unique boxes and their first occurrence in the database order
# Since I can't easily do a "DISTINCT" on a JSONB field with the SDK's simple API,
# I'll just fetch many rows and see the sequence.
res = supabase.table('kanji').select("id, data").limit(100).execute()
boxes_seen = []
for row in res.data:
    b = row.get('data', {}).get('boite')
    if b is not None:
        b_str = str(b)
        if b_str not in boxes_seen:
            boxes_seen.append(b_str)

print("First 100 rows unique boxes sequence:")
print(json.dumps(boxes_seen, indent=2))

# Also check how many rows there are and the total unique boxes
res_all = supabase.table('kanji').select("data->boite").execute()
all_boxes = []
for row in res_all.data:
    b = row.get('boite')
    if b is not None:
        all_boxes.append(str(b))

# Preserve order of appearance
unique_boxes = []
for b in all_boxes:
    if b not in unique_boxes:
        unique_boxes.append(b)

print("All unique boxes in database appearance order:")
print(json.dumps(unique_boxes, indent=2))
