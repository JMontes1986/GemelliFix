import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
