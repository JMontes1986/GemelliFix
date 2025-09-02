from supabase import create_client, Client
import os

url = os.environ.get('SUPABASE_URL') or ''
anon_key = os.environ.get('SUPABASE_ANON_KEY') or ''

supabase: Client = create_client(url, anon_key)
