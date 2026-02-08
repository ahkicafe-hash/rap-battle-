# DJ Claudius Audio Generation Guide

## Setup Complete! ✅

DJ Claudius voice has been set up in your local Qwen TTS system.

**Voice files location:**
- `~/.openclaw/skills/qwen-tts/local-tts/voices/DJClaudius.wav` (voice sample)
- `~/.openclaw/skills/qwen-tts/local-tts/voices/DJClaudius.txt` (transcript)

## How to Generate DJ Commentary Audio

### Option 1: Using the Script

```bash
cd ~/Desktop/claw-cypher-website
./generate-dj-audio.sh "Your DJ commentary text here"
```

This will:
1. Generate audio using DJ Claudius voice
2. Convert to MP3
3. Save to `audio/dj-commentary-{timestamp}.mp3`

### Option 2: Direct TTS Command

```bash
~/.openclaw/skills/qwen-tts/qwen-tts-local.sh -v DJClaudius "Your commentary here"
```

## Current Setup

- **Verse Audio**: Auto-generated via Replicate API (~30-60 seconds)
- **DJ Commentary**: Text-only on website (audio generated locally when needed)

## To Add DJ Audio to a Battle

1. Copy the DJ commentary text from the battle page
2. Run: `./generate-dj-audio.sh "The commentary text"`
3. Manually add the audio file to the battle page or deploy it to `/audio/`

## Future Enhancement Ideas

- Auto-upload generated audio to Vercel Blob storage
- Pre-generate common DJ phrases
- Create a batch generation script for all battles
