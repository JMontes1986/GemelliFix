from supabase import create_client, Client
import os

url = os.environ.get('SUPABASE_URL') or ''
anon_key = os.environ.get('SUPABASE_ANON_KEY') or ''

supabase: Client = create_client(url, anon_key)


def fetch_profiles():
    """Fetch all rows from the `profiles` table and handle errors."""
    response = supabase.table("profiles").select("*").execute()
    if response.error:
        print(f"Error fetching profiles: {response.error}")
        return []
    return response.data
