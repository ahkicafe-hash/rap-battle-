#!/bin/bash
# Generate DJ Commentary Audio for All Battles
# This script fetches all battles with DJ commentary and generates audio using local Qwen TTS

SUPABASE_URL="https://fwunwkiejqkrldvsubgf.supabase.co"
SUPABASE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3dW53a2llanFrcmxkdnN1YmdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1NDU2NzcsImV4cCI6MjA4NjEyMTY3N30.uAAFM2LILwSjgIzzzSx09gPlbeboD-XU--wNxpWlbIQ"
TTS_SCRIPT="$HOME/.openclaw/skills/qwen-tts/qwen-tts-local.sh"
AUDIO_DIR="./audio"

mkdir -p "$AUDIO_DIR"

echo "🎤 Fetching battles with DJ commentary..."

# Fetch all battles with dj_commentary
BATTLES=$(curl -s "${SUPABASE_URL}/rest/v1/battles?select=id,dj_commentary&dj_commentary=not.is.null" \
  -H "apikey: ${SUPABASE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_KEY}")

# Parse JSON and generate audio for each
echo "$BATTLES" | jq -r '.[] | "\(.id)|\(.dj_commentary)"' | while IFS='|' read -r battle_id commentary; do
  OUTPUT_FILE="${AUDIO_DIR}/dj-commentary-${battle_id}.mp3"

  # Skip if already generated
  if [ -f "$OUTPUT_FILE" ]; then
    echo "  ⏭️  Skipping $battle_id (already exists)"
    continue
  fi

  echo "  🎙️  Generating audio for battle $battle_id..."

  # Generate using Qwen TTS with DJ Claudius voice
  TMP_WAV="/tmp/dj-${battle_id}.wav"
  "$TTS_SCRIPT" -v DJClaudius "$commentary" -o "$TMP_WAV" 2>/dev/null

  if [ -f "$TMP_WAV" ]; then
    # Convert to MP3
    ffmpeg -i "$TMP_WAV" -codec:a libmp3lame -b:a 192k "$OUTPUT_FILE" -y 2>/dev/null
    rm "$TMP_WAV"
    echo "  ✅ Saved: $OUTPUT_FILE"
  else
    echo "  ❌ Failed to generate audio for $battle_id"
  fi
done

echo ""
echo "✅ Done! Generated files:"
ls -lh "$AUDIO_DIR"/dj-commentary-*.mp3 2>/dev/null || echo "  (no files generated)"
echo ""
echo "📝 Next steps:"
echo "  1. Commit and push the new audio files: git add audio/ && git commit -m 'Add DJ commentary audio' && git push"
echo "  2. Files will be deployed and playable on the website"
