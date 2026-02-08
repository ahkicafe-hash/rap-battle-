-- ClawCypher.com Database Schema (Fixed - No Circular Dependencies)
-- PostgreSQL / Supabase
-- Created: 2026-02-08

-- =====================================================
-- STEP 1: CREATE TABLES WITHOUT FOREIGN KEYS
-- =====================================================

-- 1. USERS TABLE (without clan_id FK initially)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  credits INTEGER DEFAULT 1000,
  elo_rating INTEGER DEFAULT 1000,
  total_battles INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  draws INTEGER DEFAULT 0,
  clan_id UUID, -- Will add FK later
  is_premium BOOLEAN DEFAULT false,
  premium_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. CLANS TABLE
CREATE TABLE clans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  tag TEXT UNIQUE NOT NULL,
  description TEXT,
  banner_url TEXT,
  founder_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  treasury_credits INTEGER DEFAULT 0,
  total_members INTEGER DEFAULT 1,
  elo_rating INTEGER DEFAULT 1000,
  total_wars INTEGER DEFAULT 0,
  war_wins INTEGER DEFAULT 0,
  war_losses INTEGER DEFAULT 0,
  is_recruiting BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. BOTS TABLE
CREATE TABLE bots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  avatar_url TEXT,
  personality TEXT NOT NULL,
  voice_style TEXT,
  elo_rating INTEGER DEFAULT 1000,
  total_battles INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  draws INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_bot_name_per_user UNIQUE (owner_id, name)
);

-- 4. CLAN_MEMBERS TABLE
CREATE TABLE clan_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clan_id UUID NOT NULL REFERENCES clans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_per_clan UNIQUE (user_id)
);

-- 5. BATTLES TABLE
CREATE TABLE battles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot1_id UUID NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
  bot2_id UUID NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
  winner_id UUID REFERENCES bots(id) ON DELETE SET NULL,
  bot1_score INTEGER DEFAULT 0,
  bot2_score INTEGER DEFAULT 0,
  battle_type TEXT DEFAULT 'ranked',
  status TEXT DEFAULT 'completed',
  total_rounds INTEGER DEFAULT 3,
  elo_change INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- 6. BATTLE_VERSES TABLE
CREATE TABLE battle_verses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  battle_id UUID NOT NULL REFERENCES battles(id) ON DELETE CASCADE,
  bot_id UUID NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL,
  verse_type TEXT NOT NULL,
  verse_text TEXT NOT NULL,
  score INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. LEADERBOARD TABLE
CREATE TABLE leaderboard (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  entity_name TEXT NOT NULL,
  elo_rating INTEGER NOT NULL,
  rank INTEGER NOT NULL,
  total_battles INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_leaderboard_entry UNIQUE (entity_type, entity_id)
);

-- 8. TRANSACTIONS TABLE
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL,
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. SHOP_ITEMS TABLE
CREATE TABLE shop_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  item_type TEXT NOT NULL,
  price_credits INTEGER,
  price_usd DECIMAL(10, 2),
  metadata JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. PURCHASES TABLE
CREATE TABLE purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shop_item_id UUID NOT NULL REFERENCES shop_items(id) ON DELETE RESTRICT,
  quantity INTEGER DEFAULT 1,
  total_cost_credits INTEGER,
  total_cost_usd DECIMAL(10, 2),
  stripe_payment_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. NOTIFICATIONS TABLE
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  is_read BOOLEAN DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. CLAN_WARS TABLE
CREATE TABLE clan_wars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clan1_id UUID NOT NULL REFERENCES clans(id) ON DELETE CASCADE,
  clan2_id UUID NOT NULL REFERENCES clans(id) ON DELETE CASCADE,
  winner_id UUID REFERENCES clans(id) ON DELETE SET NULL,
  clan1_score INTEGER DEFAULT 0,
  clan2_score INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',
  prize_credits INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- =====================================================
-- STEP 2: ADD FOREIGN KEY TO USERS TABLE
-- =====================================================

ALTER TABLE users
  ADD CONSTRAINT fk_users_clan
  FOREIGN KEY (clan_id) REFERENCES clans(id) ON DELETE SET NULL;

-- =====================================================
-- INDEXES (Performance Optimization)
-- =====================================================

CREATE INDEX idx_users_elo ON users(elo_rating DESC);
CREATE INDEX idx_users_clan ON users(clan_id);
CREATE INDEX idx_users_username ON users(username);

CREATE INDEX idx_bots_owner ON bots(owner_id);
CREATE INDEX idx_bots_elo ON bots(elo_rating DESC);
CREATE INDEX idx_bots_active ON bots(is_active);

CREATE INDEX idx_battles_bot1 ON battles(bot1_id);
CREATE INDEX idx_battles_bot2 ON battles(bot2_id);
CREATE INDEX idx_battles_created ON battles(created_at DESC);
CREATE INDEX idx_battles_type ON battles(battle_type);

CREATE INDEX idx_verses_battle ON battle_verses(battle_id);
CREATE INDEX idx_verses_bot ON battle_verses(bot_id);

CREATE INDEX idx_transactions_user ON transactions(user_id);
CREATE INDEX idx_transactions_created ON transactions(created_at DESC);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read);

CREATE INDEX idx_leaderboard_type_rank ON leaderboard(entity_type, rank);
CREATE INDEX idx_leaderboard_elo ON leaderboard(elo_rating DESC);

CREATE INDEX idx_clan_members_clan ON clan_members(clan_id);
CREATE INDEX idx_clan_members_user ON clan_members(user_id);

-- =====================================================
-- TRIGGERS (Auto-update timestamps)
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER bots_updated_at BEFORE UPDATE ON bots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER clans_updated_at BEFORE UPDATE ON clans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE bots ENABLE ROW LEVEL SECURITY;
ALTER TABLE clans ENABLE ROW LEVEL SECURITY;
ALTER TABLE clan_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE battles ENABLE ROW LEVEL SECURITY;
ALTER TABLE battle_verses ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE clan_wars ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read all profiles" ON users
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Anyone can read bots" ON bots
  FOR SELECT USING (true);

CREATE POLICY "Users can manage own bots" ON bots
  FOR ALL USING (auth.uid() = owner_id);

CREATE POLICY "Anyone can read battles" ON battles
  FOR SELECT USING (true);

CREATE POLICY "Anyone can read verses" ON battle_verses
  FOR SELECT USING (true);

CREATE POLICY "Anyone can read clans" ON clans
  FOR SELECT USING (true);

CREATE POLICY "Anyone can read leaderboard" ON leaderboard
  FOR SELECT USING (true);

CREATE POLICY "Anyone can read shop items" ON shop_items
  FOR SELECT USING (true);

CREATE POLICY "Users can read own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can read own transactions" ON transactions
  FOR SELECT USING (auth.uid() = user_id);

-- =====================================================
-- SAMPLE DATA
-- =====================================================

INSERT INTO shop_items (name, description, item_type, price_credits, price_usd, metadata) VALUES
  ('100 Credits Pack', 'Get 100 credits instantly', 'credits_pack', NULL, 1.00, '{"credits": 100}'),
  ('500 Credits Pack', 'Get 500 credits instantly', 'credits_pack', NULL, 4.00, '{"credits": 500}'),
  ('1000 Credits Pack', 'Get 1000 credits + 100 bonus!', 'credits_pack', NULL, 7.50, '{"credits": 1100}'),
  ('Extra Bot Slot', 'Create one more bot', 'bot_slot', 500, NULL, '{"slots": 1}'),
  ('Premium (30 days)', 'Premium features for 30 days', 'premium', NULL, 9.99, '{"duration_days": 30}');
