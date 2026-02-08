# ClawCypher Testing Guide

## What's Been Implemented

### ✅ Core Features (Ready to Test!)

1. **Authentication System**
   - Sign up with email/password
   - Login with email/password
   - Session management
   - Protected pages (auto-redirect if not logged in)

2. **Bot Builder**
   - Create new bots with name, personality, voice style
   - Edit existing bots
   - Form validation

3. **Battle Arena Hub**
   - Welcome dashboard with user stats
   - Display user's bots
   - Opponent discovery based on ELO
   - Navigate to bot builder
   - Battle initiation flow (leads to battleprep - not yet built)

4. **Database Security**
   - Production-ready RLS policies
   - Proper authentication checks
   - User data isolation

## Setup Instructions

### 1. Apply RLS Policies to Supabase

Option A - Using Supabase Dashboard:
```bash
# Copy the contents of this file:
cat supabase/migrations/20260208_production_rls_policies.sql

# Then:
# 1. Go to https://supabase.com/dashboard
# 2. Select your project (fwunwkiejqkrldvsubgf)
# 3. Go to SQL Editor
# 4. Paste the entire SQL file
# 5. Click "Run"
```

Option B - Using Supabase CLI (if installed):
```bash
supabase db push
```

### 2. Start Local Dev Server

```bash
cd /Users/harrysmith/Desktop/claw-cypher-website
python3 -m http.server 8080
```

Then open: http://localhost:8080

### 3. Remove Test RLS Policies (Important!)

The test policies from `enable-test-rls.sql` are too permissive. The production policies we just added will work better, but you may need to drop the old test policies first if they conflict.

Run this in Supabase SQL Editor:
```sql
-- Drop test policies
DROP POLICY IF EXISTS "Allow anonymous insert for testing" ON users;
DROP POLICY IF EXISTS "Allow anonymous read users for testing" ON users;
DROP POLICY IF EXISTS "Allow anonymous bot insert for testing" ON bots;
DROP POLICY IF EXISTS "Allow anonymous read bots for testing" ON bots;
```

## Testing Checklist

### Test 1: User Sign Up
1. Go to `/auth.html`
2. Click "Sign Up" tab
3. Enter:
   - Username: testuser1
   - Email: test1@example.com
   - Password: TestPass123!
   - Confirm password
4. Click "Create Account"
5. **Expected**: Success message, switches to login tab
6. **Check Supabase**: Go to Authentication > Users - should see new user

### Test 2: User Login
1. Stay on `/auth.html`
2. Click "Sign In" tab
3. Enter your credentials
4. Click "Enter The Cypher"
5. **Expected**: Redirects to `/arena.html`
6. **Check**: Top nav should show your username and "LOGOUT" button

### Test 3: Create a Bot
1. From Arena page, click "+ Create New Bot"
2. OR go directly to `/botbuilder.html`
3. Fill in:
   - Name: MC Thunder
   - Personality: Aggressive and intense, drops heavy metaphors about storms and lightning
   - Voice Style: Deep and powerful
4. Click "Create Bot"
5. **Expected**: Success message, redirects to arena
6. **Check**: Bot should appear in "Your Bots" section
7. **Check Supabase**: Go to Table Editor > bots - should see new bot

### Test 4: Edit a Bot
1. From Arena, click "Edit" on one of your bots
2. Modify the personality
3. Click "Save Changes"
4. **Expected**: Success message, redirects to My Bots
5. **Check**: Changes should be saved

### Test 5: Opponent Discovery
1. Create 2-3 bots with your account
2. **To test opponent discovery, you need multiple users:**
   - Option A: Create another account (different email)
   - Option B: Use test-auth.html to create dummy users/bots
3. Go back to Arena with your main account
4. **Expected**: "Find Opponents" section shows bots from other users
5. **Check**: Only shows bots within ±200 ELO range (everyone starts at 1000)

### Test 6: Protected Pages
1. Click "Logout" button
2. Try to access `/arena.html` directly
3. **Expected**: Immediately redirects to `/auth.html`
4. Same for `/botbuilder.html`

### Test 7: Session Persistence
1. Log in
2. Close the browser tab
3. Open a new tab to http://localhost:8080/arena.html
4. **Expected**: Still logged in, arena loads normally

## Known Issues / Not Yet Implemented

### 🚧 Features Not Yet Built
- **My Bots page** (mybots.html) - shows list of all your bots
- **Battle Prep page** (battleprep.html) - pre-battle confirmation screen
- **Live Battle page** (livebattle.html) - watch AI battle unfold
- **Profile page** (profile.html) - user profile with stats
- **Battle API integration** - actual AI battle generation

### ⚠️ Current Limitations
- Battle flow stops at Arena - clicking "Battle" button will try to go to battleprep.html (not built yet)
- No actual battles can be executed yet
- ELO ratings don't update (no battles)
- Nav bar on some pages may not show user info correctly (need to add auth.js to all pages)

## What You Can Test Right Now

✅ Sign up / Login / Logout
✅ Create bots (unlimited)
✅ Edit bots
✅ View your bots in Arena
✅ See opponent bots
✅ Protected page redirects
✅ Session management

## Database Verification

Check your Supabase database tables:

1. **users table**
   - Should have your user record with correct ELO (1000)
   - Credits should be 1000

2. **bots table**
   - Should have all your created bots
   - Each bot should have owner_id matching your user ID
   - is_active should be true
   - elo_rating should be 1000

3. **RLS Policies**
   - Go to Table Editor > Click on table > Click "... More" > "View Policies"
   - Should see production policies applied
   - No "Allow anonymous" test policies

## Troubleshooting

### Issue: "Not authenticated" errors
- **Solution**: Make sure you're logged in. Check browser console for errors.
- **Check**: Look at Application > Storage > Local Storage in DevTools - should have Supabase auth token

### Issue: Can't see other users' bots in opponents section
- **Solution**: Create bots with a second test account, or they all have similar ELO ratings
- **Check**: Opponent discovery only shows bots within ±200 ELO range

### Issue: RLS policy errors in console
- **Solution**: Make sure you ran the production RLS policies SQL
- **Check**: Verify policies exist in Supabase dashboard

### Issue: "Failed to load bots" error
- **Solution**: Check browser console for specific error
- **Possible causes**:
  1. RLS policies not applied
  2. Not authenticated
  3. Supabase connection issue (check .env file)

## Next Steps (Future Implementation)

Once testing is complete, the next phase would add:

1. **Battle System**
   - Battle Prep page
   - Live Battle viewer with animations
   - Integration with existing `/api/battle.js`
   - ELO rating updates

2. **Social Features**
   - My Bots management page
   - User Profile page
   - Friends system
   - Feed

3. **Economy**
   - Credits system
   - Paid battles
   - Store/shop

## Need Help?

If you encounter issues:
1. Check browser console (F12) for errors
2. Check Supabase logs (Dashboard > Logs)
3. Verify RLS policies are applied
4. Make sure local server is running on port 8080

## Success Criteria

You'll know everything is working when you can:
- ✅ Create a new account
- ✅ Log in and see your username in nav
- ✅ Create multiple bots
- ✅ See your bots in Arena
- ✅ See other users' bots in Find Opponents
- ✅ Edit a bot successfully
- ✅ Log out and back in
- ✅ Protected pages redirect when not logged in

Good luck testing! 🎤🔥
