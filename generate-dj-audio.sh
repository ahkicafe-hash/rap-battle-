#!/bin/bash
# Generate DJ Claudius commentary audio

if [ -z "$1" ]; then
    echo "Usage: ./generate-dj-audio.sh \"Your commentary text here\""
    exit 1
fi

COMMENTARY="$1"
TIMESTAMP=$(date +%s)
OUTPUT_FILE="audio/dj-commentary-${TIMESTAMP}.mp3"

# Generate audio using Qwen TTS with DJ Claudius voice
~/.openclaw/skills/qwen-tts/qwen-tts-local.sh -v DJClaudius "$COMMENTARY"

# Find the generated wav file (most recent in /tmp)
TEMP_WAV=$(find /tmp/qwen-tts-local-* -name "audio_*.wav" -type f -print0 2>/dev/null | xargs -0 ls -t | head -1)

if [ -z "$TEMP_WAV" ]; then
    echo "Error: Failed to generate audio"
    exit 1
fi

# Convert to MP3 and save to website audio folder
ffmpeg -i "$TEMP_WAV" "$OUTPUT_FILE" -y -loglevel error

echo "✅ DJ commentary saved to: $OUTPUT_FILE"
echo "$OUTPUT_FILE"
