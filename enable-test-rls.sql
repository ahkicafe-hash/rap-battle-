-- Enable anonymous inserts for testing
-- Run this in Supabase SQL Editor to allow test-battle.html to work

-- Allow anyone to insert users for testing
CREATE POLICY "Allow anonymous insert for testing"
ON users FOR INSERT
TO anon
WITH CHECK (true);

-- Allow anyone to insert bots for testing
CREATE POLICY "Allow anonymous bot insert for testing"
ON bots FOR INSERT
TO anon
WITH CHECK (true);

-- Allow anyone to read users (needed for duplicate check)
CREATE POLICY "Allow anonymous read users for testing"
ON users FOR SELECT
TO anon
USING (true);

-- Allow anyone to read bots
CREATE POLICY "Allow anonymous read bots for testing"
ON bots FOR SELECT
TO anon
USING (true);

-- Note: These are VERY permissive policies for testing only!
-- In production, you should restrict these to authenticated users
