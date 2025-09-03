-- Enable Row Level Security and define policies for the `profiles` table.
-- This setup allows users to read their own profile while restricting access to others.
-- The service role key bypasses RLS for trusted server-side operations.

-- Enable RLS on the table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to read only their own profile
CREATE POLICY "Individuals can view their own profile" ON profiles
    FOR SELECT
    USING (auth.uid() = id);

-- Allow authenticated users to insert their profile
CREATE POLICY "Authenticated users can insert their own profile" ON profiles
    FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Allow service role to manage all profiles
CREATE POLICY "Service role has full access" ON profiles
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
