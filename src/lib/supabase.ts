import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

// Client used on the browser with limited privileges.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// A separate client that can bypass RLS using the service role key.
// This key must never be exposed in the browser and should only be
// set in secure server-side environments (e.g., production).
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
export const supabaseAdmin = serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey)
  : supabase;

/**
 * Fetches all profiles from the `profiles` table.
 * Logs and returns an empty array if the query fails.
 */
export async function fetchProfiles() {
  const { data, error } = await supabase.from('profiles').select('*');

  if (error) {
    console.error('Error fetching profiles:', error);
    return [];
  }

  return data;
}

export default supabase;
