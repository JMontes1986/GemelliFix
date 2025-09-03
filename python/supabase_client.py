from supabase import create_client, Client
import os

url = os.environ.get('SUPABASE_URL') or ''

# Use the service role key when available for privileged operations.
# This key should only be set in secure server-side environments.
service_key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY') or ''
anon_key = os.environ.get('SUPABASE_ANON_KEY') or ''

supabase: Client = create_client(url, service_key or anon_key)


def fetch_profiles():
    """Fetch all rows from the `profiles` table and handle errors."""
    response = supabase.table("profiles").select("*").execute()
    if response.error:
        print(f"Error fetching profiles: {response.error}")
        return []
    return response.data
