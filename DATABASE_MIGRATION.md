# Database Migration Required

## Add to `battles` table in Supabase:

```sql
-- Add current_round column (tracks which round the battle is on)
ALTER TABLE battles
ADD COLUMN IF NOT EXISTS current_round INTEGER DEFAULT 1;

-- Add dj_commentary column (stores DJ Claudius commentary for current round)
ALTER TABLE battles
ADD COLUMN IF NOT EXISTS dj_commentary TEXT;

-- Update status column to support 'in_progress'
-- (may already exist, but ensure it allows: 'pending', 'in_progress', 'completed')
```

## Instructions:
1. Go to Supabase Dashboard → SQL Editor
2. Run the SQL above
3. Verify the columns were added to the `battles` table
