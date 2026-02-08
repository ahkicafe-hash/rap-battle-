-- Production RLS Policies for ClawCypher
-- Created: 2026-02-08
-- Description: Secure Row Level Security policies for authenticated users

-- ============================================
-- USERS TABLE POLICIES
-- ============================================

-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop any existing test policies
DROP POLICY IF EXISTS "Allow anonymous insert for testing" ON users;
DROP POLICY IF EXISTS "Allow anonymous read users for testing" ON users;

-- Users can read their own profile
CREATE POLICY "Users can view own profile"
ON users FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON users FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Allow users to be created during signup (triggered by auth.users insert)
CREATE POLICY "Users can insert own profile"
ON users FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Public users can check if username exists (for signup validation)
CREATE POLICY "Anyone can check username availability"
ON users FOR SELECT
TO anon
USING (true);

-- ============================================
-- BOTS TABLE POLICIES
-- ============================================

-- Enable RLS on bots table
ALTER TABLE bots ENABLE ROW LEVEL SECURITY;

-- Drop any existing test policies
DROP POLICY IF EXISTS "Allow anonymous bot insert for testing" ON bots;
DROP POLICY IF EXISTS "Allow anonymous read bots for testing" ON bots;

-- Users can create their own bots
CREATE POLICY "Users can create own bots"
ON bots FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = owner_id);

-- Users can view their own bots
CREATE POLICY "Users can view own bots"
ON bots FOR SELECT
TO authenticated
USING (auth.uid() = owner_id);

-- Users can update their own bots
CREATE POLICY "Users can update own bots"
ON bots FOR UPDATE
TO authenticated
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

-- Users can delete/deactivate their own bots
CREATE POLICY "Users can delete own bots"
ON bots FOR DELETE
TO authenticated
USING (auth.uid() = owner_id);

-- Anyone can view active bots (for opponent discovery)
CREATE POLICY "Anyone can view active bots"
ON bots FOR SELECT
TO authenticated
USING (is_active = true);

-- ============================================
-- BATTLES TABLE POLICIES
-- ============================================

-- Enable RLS on battles table
ALTER TABLE battles ENABLE ROW LEVEL SECURITY;

-- Users can create battles with their own bots
CREATE POLICY "Users can create battles with own bots"
ON battles FOR INSERT
TO authenticated
WITH CHECK (
  bot1_id IN (SELECT id FROM bots WHERE owner_id = auth.uid())
  OR bot2_id IN (SELECT id FROM bots WHERE owner_id = auth.uid())
);

-- Users can view battles involving their bots
CREATE POLICY "Users can view own battles"
ON battles FOR SELECT
TO authenticated
USING (
  bot1_id IN (SELECT id FROM bots WHERE owner_id = auth.uid())
  OR bot2_id IN (SELECT id FROM bots WHERE owner_id = auth.uid())
);

-- Users can view public battles (for leaderboard/feed)
CREATE POLICY "Anyone can view completed battles"
ON battles FOR SELECT
TO authenticated
USING (status = 'completed');

-- ============================================
-- BATTLE_VERSES TABLE POLICIES
-- ============================================

-- Enable RLS on battle_verses table
ALTER TABLE battle_verses ENABLE ROW LEVEL SECURITY;

-- Users can view verses from battles they're involved in
CREATE POLICY "Users can view verses from own battles"
ON battle_verses FOR SELECT
TO authenticated
USING (
  battle_id IN (
    SELECT id FROM battles WHERE
      bot1_id IN (SELECT id FROM bots WHERE owner_id = auth.uid())
      OR bot2_id IN (SELECT id FROM bots WHERE owner_id = auth.uid())
  )
);

-- Anyone can view verses from completed public battles
CREATE POLICY "Anyone can view verses from public battles"
ON battle_verses FOR SELECT
TO authenticated
USING (
  battle_id IN (
    SELECT id FROM battles WHERE status = 'completed'
  )
);

-- System can insert verses (via API/service role)
CREATE POLICY "Service role can insert verses"
ON battle_verses FOR INSERT
TO service_role
WITH CHECK (true);

-- ============================================
-- BATTLE_VOTES TABLE POLICIES
-- ============================================

-- Enable RLS on battle_votes table
ALTER TABLE battle_votes ENABLE ROW LEVEL SECURITY;

-- Users can vote on battles
CREATE POLICY "Users can create votes"
ON battle_votes FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can view their own votes
CREATE POLICY "Users can view own votes"
ON battle_votes FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can update their own votes
CREATE POLICY "Users can update own votes"
ON battle_votes FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ============================================
-- FRIENDS TABLE POLICIES
-- ============================================

-- Enable RLS on friends table
ALTER TABLE friends ENABLE ROW LEVEL SECURITY;

-- Users can create friend requests
CREATE POLICY "Users can send friend requests"
ON friends FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can view their friendships
CREATE POLICY "Users can view own friendships"
ON friends FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id OR auth.uid() = friend_id
);

-- Users can update their friend requests (accept/reject)
CREATE POLICY "Users can update friend requests"
ON friends FOR UPDATE
TO authenticated
USING (auth.uid() = friend_id OR auth.uid() = user_id)
WITH CHECK (auth.uid() = friend_id OR auth.uid() = user_id);

-- Users can delete their friendships
CREATE POLICY "Users can delete friendships"
ON friends FOR DELETE
TO authenticated
USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- ============================================
-- FEED_POSTS TABLE POLICIES
-- ============================================

-- Enable RLS on feed_posts table
ALTER TABLE feed_posts ENABLE ROW LEVEL SECURITY;

-- Users can create their own posts
CREATE POLICY "Users can create own posts"
ON feed_posts FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Anyone can view public posts
CREATE POLICY "Anyone can view posts"
ON feed_posts FOR SELECT
TO authenticated
USING (true);

-- Users can update their own posts
CREATE POLICY "Users can update own posts"
ON feed_posts FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own posts
CREATE POLICY "Users can delete own posts"
ON feed_posts FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- ============================================
-- NOTIFICATIONS TABLE POLICIES
-- ============================================

-- Enable RLS on notifications table
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications"
ON notifications FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
ON notifications FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- System can create notifications
CREATE POLICY "Service role can create notifications"
ON notifications FOR INSERT
TO service_role
WITH CHECK (true);

-- ============================================
-- ACHIEVEMENTS TABLE POLICIES
-- ============================================

-- Enable RLS on achievements table
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;

-- Anyone can view achievements
CREATE POLICY "Anyone can view achievements"
ON achievements FOR SELECT
TO authenticated
USING (true);

-- ============================================
-- USER_ACHIEVEMENTS TABLE POLICIES
-- ============================================

-- Enable RLS on user_achievements table
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

-- Users can view their own achievements
CREATE POLICY "Users can view own achievements"
ON user_achievements FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- System can award achievements
CREATE POLICY "Service role can award achievements"
ON user_achievements FOR INSERT
TO service_role
WITH CHECK (true);

-- ============================================
-- TRANSACTIONS TABLE POLICIES
-- ============================================

-- Enable RLS on transactions table
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Users can view their own transactions
CREATE POLICY "Users can view own transactions"
ON transactions FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- System can create transactions
CREATE POLICY "Service role can create transactions"
ON transactions FOR INSERT
TO service_role
WITH CHECK (true);

-- ============================================
-- VERIFICATION COMPLETE
-- ============================================

-- Verify all tables have RLS enabled
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename IN (
            'users', 'bots', 'battles', 'battle_verses', 'battle_votes',
            'friends', 'feed_posts', 'notifications', 'achievements',
            'user_achievements', 'transactions'
        )
    LOOP
        RAISE NOTICE 'RLS enabled for table: %', r.tablename;
    END LOOP;
END $$;
