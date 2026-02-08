-- Allow anonymous users to delete bots for testing
CREATE POLICY "Allow anonymous bot delete for testing"
ON bots FOR DELETE
TO anon
USING (true);
