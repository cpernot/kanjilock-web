import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(url, key)

# This doesn't directly list tables easily without RPC or standard query,
# but I can try to query common tables or use information_schema if permissions allow.

res = supabase.rpc('get_tables', {}).execute() # If such RPC exists
print(res.data)
