/**
 * Generate Audio for Battle Verse (Async)
 * Vercel Serverless Function
 *
 * POST /api/generate-audio
 * Body: { verse_id: string }
 *
 * Creates a Replicate prediction for audio generation and returns immediately.
 * The prediction ID is stored in the verse's audio_url field as a placeholder
 * (prefixed with "pending:"). The frontend should poll /api/audio-status to
 * check when the audio is ready.
 *
 * This avoids Vercel's 10s (Hobby) / 60s (Pro) function timeout by NOT
 * waiting for the audio generation to complete.
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_KEY;

/**
 * Create a Replicate prediction (non-blocking).
 * Returns the prediction object with its ID.
 */
async function createPrediction(verseText, botName) {
  // minimax/music-01 uses "lyrics" not "prompt", max ~400 chars
  const lyrics = `${botName} spitting fire:\n${verseText}`.substring(0, 400);

  const response = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${REPLICATE_API_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      version: '0254c7e2f54315b667dbae03da7c155822ba29ffe0457be5bc246d564be486bd',
      input: {
        lyrics: lyrics
      }
    })
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Replicate API error (${response.status}): ${errorBody}`);
  }

  return response.json();
}

/**
 * Main handler
 */
export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { verse_id, text, voice } = req.body;

    // Support two modes: verse_id OR direct text
    if (!verse_id && !text) {
      return res.status(400).json({ error: 'Missing verse_id or text' });
    }

    let lyrics, displayName;

    if (verse_id) {
      // Mode 1: Generate audio for a verse from the database
      const { data: verse, error: verseError } = await supabase
        .from('battle_verses')
        .select('*, battle:battles!battle_verses_battle_id_fkey(bot1_id, bot2_id), bot:bots!battle_verses_bot_id_fkey(name)')
        .eq('id', verse_id)
        .single();

      if (verseError || !verse) {
        return res.status(404).json({ error: 'Verse not found' });
      }

      // If audio already exists and is a real URL (not a pending prediction), return it
      if (verse.audio_url && !verse.audio_url.startsWith('pending:')) {
        return res.status(200).json({
          success: true,
          audio_url: verse.audio_url,
          status: 'ready',
          cached: true
        });
      }

      // If a prediction is already in progress, return that status
      if (verse.audio_url && verse.audio_url.startsWith('pending:')) {
        const predictionId = verse.audio_url.replace('pending:', '');
        return res.status(200).json({
          success: true,
          status: 'processing',
          prediction_id: predictionId,
          message: 'Audio generation already in progress. Poll /api/audio-status for updates.'
        });
      }

      lyrics = verse.verse_text;
      displayName = verse.bot.name;

      // Create a new prediction (non-blocking)
      console.log(`Creating audio prediction for ${displayName} (verse ${verse_id})...`);
      const prediction = await createPrediction(lyrics, displayName);

      if (!prediction.id) {
        throw new Error('No prediction ID returned from Replicate');
      }

      console.log(`Prediction created: ${prediction.id}`);

      // Store the prediction ID as a placeholder in the audio_url field
      const { error: updateError } = await supabase
        .from('battle_verses')
        .update({ audio_url: `pending:${prediction.id}` })
        .eq('id', verse_id);

      if (updateError) {
        console.error('Error storing prediction ID:', updateError);
        // Don't throw -- the prediction is still running, just log it
      }

      return res.status(202).json({
        success: true,
        status: 'processing',
        prediction_id: prediction.id,
        message: 'Audio generation started. Poll /api/audio-status for updates.'
      });

    } else {
      // Mode 2: Generate audio from direct text (for DJ commentary, etc.)
      lyrics = text.substring(0, 400); // Limit to 400 chars
      displayName = voice === 'dj-claudius' ? 'DJ Claudius' : 'Narrator';

      console.log(`Creating audio prediction for ${displayName} (direct text)...`);
      const prediction = await createPrediction(lyrics, displayName);

      if (!prediction.id) {
        throw new Error('No prediction ID returned from Replicate');
      }

      console.log(`Prediction created: ${prediction.id}`);

      return res.status(202).json({
        success: true,
        status: 'processing',
        prediction_id: prediction.id,
        message: 'Audio generation started. Poll /api/audio-status for updates.'
      });
    }

  } catch (error) {
    console.error('Audio generation error:', error);
    return res.status(500).json({
      error: 'Audio generation failed',
      message: error.message
    });
  }
}
