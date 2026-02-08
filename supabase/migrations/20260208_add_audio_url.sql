-- Add audio_url column to battle_verses table
ALTER TABLE battle_verses ADD COLUMN IF NOT EXISTS audio_url TEXT;

-- Add comment
COMMENT ON COLUMN battle_verses.audio_url IS 'URL to the generated audio file for this verse (MiniMax music generation)';
