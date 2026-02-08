/**
 * Audio Status Checker
 * Vercel Serverless Function
 *
 * GET /api/audio-status?verse_id=xxx
 *
 * Checks if audio generation is complete for a given verse.
 * If the verse has a "pending:<prediction_id>" audio_url, this endpoint
 * checks the Replicate prediction status and updates the DB when done.
 *
 * Returns:
 *   { status: "ready", audio_url: "https://..." }     -- audio is done
 *   { status: "processing" }                           -- still generating
 *   { status: "failed", error: "..." }                 -- generation failed
 *   { status: "no_audio" }                             -- no audio requested yet
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_KEY;

/**
 * Check a Replicate prediction's status
 */
async function checkPrediction(predictionId) {
  const response = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
    headers: {
      'Authorization': `Bearer ${REPLICATE_API_TOKEN}`,
    }
  });

  if (!response.ok) {
    throw new Error(`Replicate API error (${response.status})`);
  }

  return response.json();
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { verse_id, prediction_id } = req.query;

    if (!verse_id && !prediction_id) {
      return res.status(400).json({ error: 'Missing verse_id or prediction_id query parameter' });
    }

    let predictionIdToCheck = prediction_id;
    let shouldUpdateDB = false;
    let verseIdForUpdate = null;

    if (verse_id) {
      // Mode 1: Check status for a verse (will update DB when complete)
      const { data: verse, error: verseError } = await supabase
        .from('battle_verses')
        .select('id, audio_url')
        .eq('id', verse_id)
        .single();

      if (verseError || !verse) {
        return res.status(404).json({ error: 'Verse not found' });
      }

      // Case 1: No audio URL at all -- nothing has been requested yet
      if (!verse.audio_url) {
        return res.status(200).json({ status: 'no_audio' });
      }

      // Case 2: Audio is already ready (not pending)
      if (!verse.audio_url.startsWith('pending:')) {
        return res.status(200).json({
          status: 'ready',
          audio_url: verse.audio_url
        });
      }

      // Case 3: Audio is still pending -- extract prediction ID
      predictionIdToCheck = verse.audio_url.replace('pending:', '');
      shouldUpdateDB = true;
      verseIdForUpdate = verse_id;
    }

    // Check prediction status (either from verse or direct prediction_id)
    if (!predictionIdToCheck) {
      return res.status(400).json({ error: 'No prediction ID found' });
    }

    const prediction = await checkPrediction(predictionIdToCheck);

    console.log(`Prediction ${predictionIdToCheck} status: ${prediction.status}`,
                `data_removed: ${prediction.data_removed || false}`);

    if (prediction.status === 'succeeded') {
      // Check if data has been removed (expires after 1 hour)
      if (prediction.data_removed) {
        console.error(`Prediction ${predictionIdToCheck}: data_removed=true`);

        if (shouldUpdateDB && verseIdForUpdate) {
          await supabase
            .from('battle_verses')
            .update({ audio_url: null })
            .eq('id', verseIdForUpdate);
        }

        return res.status(200).json({
          status: 'failed',
          error: 'Audio output expired (Replicate removes outputs after 1 hour)',
          retryable: true
        });
      }

      // Extract the audio URL from the prediction output
      // minimax/music-1.5 returns the URL in prediction.output
      const audioUrl = typeof prediction.output === 'string'
        ? prediction.output
        : (prediction.output?.audio || prediction.output?.[0] || prediction.output);

      if (!audioUrl || typeof audioUrl !== 'string') {
        console.error('Unexpected prediction output format:', prediction.output);

        if (shouldUpdateDB && verseIdForUpdate) {
          await supabase
            .from('battle_verses')
            .update({ audio_url: null })
            .eq('id', verseIdForUpdate);
        }

        return res.status(200).json({
          status: 'failed',
          error: 'Unexpected audio output format from Replicate',
          retryable: true
        });
      }

      // Update the database if this was from a verse
      if (shouldUpdateDB && verseIdForUpdate) {
        const { error: updateError } = await supabase
          .from('battle_verses')
          .update({ audio_url: audioUrl })
          .eq('id', verseIdForUpdate);

        if (updateError) {
          console.error('Error updating verse audio_url:', updateError);
        } else {
          console.log(`✅ Verse ${verseIdForUpdate} audio ready: ${audioUrl.substring(0, 50)}...`);
        }
      }

      return res.status(200).json({
        status: 'ready',
        audio_url: audioUrl
      });
    }

    if (prediction.status === 'failed' || prediction.status === 'canceled' || prediction.status === 'aborted') {
      // Clear the pending marker so it can be retried (only for verses)
      if (shouldUpdateDB && verseIdForUpdate) {
        await supabase
          .from('battle_verses')
          .update({ audio_url: null })
          .eq('id', verseIdForUpdate);
      }

      return res.status(200).json({
        status: 'failed',
        error: prediction.error || `Audio generation ${prediction.status}`,
        retryable: true
      });
    }

    // Still processing (status: 'starting' or 'processing')
    return res.status(200).json({
      status: 'processing',
      prediction_status: prediction.status
    });

  } catch (error) {
    console.error('Audio status check error:', error);
    return res.status(500).json({
      error: 'Status check failed',
      message: error.message
    });
  }
}
