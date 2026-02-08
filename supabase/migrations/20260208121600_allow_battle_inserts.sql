-- Allow anonymous users to create battles and battle verses for testing

-- Allow anonymous inserts into battles table
CREATE POLICY "Allow anonymous battle insert for testing"
ON battles FOR INSERT
TO anon
WITH CHECK (true);

-- Allow anonymous inserts into battle_verses table
CREATE POLICY "Allow anonymous battle_verse insert for testing"
ON battle_verses FOR INSERT
TO anon
WITH CHECK (true);

-- Allow anonymous to read battles (to check results)
CREATE POLICY "Allow anonymous read battles for testing"
ON battles FOR SELECT
TO anon
USING (true);

-- Allow anonymous to read battle_verses
CREATE POLICY "Allow anonymous read battle_verses for testing"
ON battle_verses FOR SELECT
TO anon
USING (true);

-- Allow anonymous to update bots (for ELO rating updates)
CREATE POLICY "Allow anonymous bot update for testing"
ON bots FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

-- Allow anonymous to update users (for total_battles counter)
CREATE POLICY "Allow anonymous user update for testing"
ON users FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);
