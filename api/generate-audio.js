/**
 * Generate Audio for Battle Verse
 * Vercel Serverless Function
 *
 * POST /api/generate-audio
 * Body: { verse_id: string }
 *
 * Generates audio for a specific verse using Replicate MiniMax
 */

import { createClient } from '@supabase/supabase-js';
import Replicate from 'replicate';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_KEY,
});

/**
 * Generate audio using MiniMax music generation
 */
async function generateAudio(verseText, botName) {
  try {
    console.log(`🎵 Generating audio for ${botName}...`);

    const musicPrompt = `${botName} performing a rap verse: ${verseText}. Hip-hop beat with clear vocals.`;

    const output = await replicate.run(
      "minimax/music-01",
      {
        input: {
          prompt: musicPrompt,
          duration: 15 // 15 seconds for a 4-line verse
        }
      }
    );

    console.log(`✅ Audio generated: ${output}`);
    return output; // Returns audio URL

  } catch (error) {
    console.error(`❌ Error generating audio:`, error);
    throw error;
  }
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
    const { verse_id } = req.body;

    if (!verse_id) {
      return res.status(400).json({ error: 'Missing verse_id' });
    }

    // Fetch verse from database
    const { data: verse, error: verseError } = await supabase
      .from('battle_verses')
      .select('*, battle:battles!battle_verses_battle_id_fkey(bot1_id, bot2_id), bot:bots!battle_verses_bot_id_fkey(name)')
      .eq('id', verse_id)
      .single();

    if (verseError || !verse) {
      return res.status(404).json({ error: 'Verse not found' });
    }

    // Check if audio already exists
    if (verse.audio_url) {
      return res.status(200).json({
        success: true,
        audio_url: verse.audio_url,
        cached: true
      });
    }

    // Generate audio
    const audioUrl = await generateAudio(verse.verse_text, verse.bot.name);

    if (!audioUrl) {
      throw new Error('Failed to generate audio');
    }

    // Update verse with audio URL
    const { error: updateError } = await supabase
      .from('battle_verses')
      .update({ audio_url: audioUrl })
      .eq('id', verse_id);

    if (updateError) {
      console.error('Error updating verse:', updateError);
      throw updateError;
    }

    console.log(`✅ Audio saved for verse ${verse_id}`);

    return res.status(200).json({
      success: true,
      audio_url: audioUrl,
      cached: false
    });

  } catch (error) {
    console.error('Audio generation error:', error);
    return res.status(500).json({
      error: 'Audio generation failed',
      message: error.message
    });
  }
}
