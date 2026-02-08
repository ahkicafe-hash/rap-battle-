/**
 * ClawCypher Battle Engine API
 * Vercel Serverless Function
 *
 * POST /api/battle
 * Body: { bot1_id: string, bot2_id: string }
 *
 * Generates an AI rap battle between two bots using Groq API
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

/**
 * Generate a rap verse using Groq AI
 */
async function generateVerse(botName, botPersonality, opponentName, verseType, previousVerses = []) {
  const prompts = {
    opening: `You are ${botName}, a ${botPersonality} battle rapper. Write a fierce 4-line opening verse to start a rap battle against ${opponentName}. Make it creative, punchy, and packed with wordplay. Focus on establishing dominance.`,
    comeback: `You are ${botName}, a ${botPersonality} battle rapper. ${opponentName} just dissed you. Write a savage 4-line comeback verse. Counter their attack and hit back harder. Previous context:\n${previousVerses.join('\n')}`,
    final: `You are ${botName}, a ${botPersonality} battle rapper. This is your final verse. Write an epic 4-line closing statement to finish ${opponentName}. Make it your most devastating verse yet. Previous context:\n${previousVerses.join('\n')}`
  };

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are a skilled battle rapper. Generate creative, punchy rap verses with good flow and clever wordplay. Keep verses to exactly 4 lines. Be fierce but not offensive.'
        },
        {
          role: 'user',
          content: prompts[verseType]
        }
      ],
      temperature: 0.9,
      max_tokens: 150
    })
  });

  if (!response.ok) {
    throw new Error(`Groq API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content.trim();
}

/**
 * AI judge scores a verse (1-10)
 */
async function judgeVerse(verse, botName, opponentName) {
  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are a professional rap battle judge. Rate verses on creativity, flow, wordplay, and impact. Respond with ONLY a number from 1-10.'
        },
        {
          role: 'user',
          content: `Rate this rap verse from ${botName} against ${opponentName} (1-10):\n\n"${verse}"`
        }
      ],
      temperature: 0.3,
      max_tokens: 10
    })
  });

  const data = await response.json();
  const scoreText = data.choices[0].message.content.trim();
  const score = parseInt(scoreText.match(/\d+/)?.[0] || '5');
  return Math.max(1, Math.min(10, score)); // Clamp to 1-10
}

/**
 * Calculate ELO rating change
 */
function calculateELO(winnerRating, loserRating, isDraw = false) {
  const K = 32; // ELO K-factor
  const expectedWinner = 1 / (1 + Math.pow(10, (loserRating - winnerRating) / 400));
  const expectedLoser = 1 / (1 + Math.pow(10, (winnerRating - loserRating) / 400));

  if (isDraw) {
    const winnerChange = Math.round(K * (0.5 - expectedWinner));
    const loserChange = Math.round(K * (0.5 - expectedLoser));
    return { winnerChange, loserChange };
  }

  const winnerChange = Math.round(K * (1 - expectedWinner));
  const loserChange = Math.round(K * (0 - expectedLoser));

  return { winnerChange, loserChange };
}

// Audio generation removed - now handled on-demand by /api/generate-audio.js
// This prevents timeout issues and allows battles to complete quickly

/**
 * Main battle handler
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
    const { bot1_id, bot2_id } = req.body;

    if (!bot1_id || !bot2_id) {
      return res.status(400).json({ error: 'Missing bot IDs' });
    }

    // Fetch both bots from database
    const { data: bots, error: botsError } = await supabase
      .from('bots')
      .select('*')
      .in('id', [bot1_id, bot2_id]);

    if (botsError || bots.length !== 2) {
      return res.status(404).json({ error: 'Bots not found' });
    }

    const bot1 = bots.find(b => b.id === bot1_id);
    const bot2 = bots.find(b => b.id === bot2_id);

    console.log(`🎤 Battle starting: ${bot1.name} vs ${bot2.name}`);

    // Battle structure: 3 rounds, each bot gets a verse per round
    const rounds = [];
    const allVerses = [];

    for (let round = 1; round <= 3; round++) {
      console.log(`Round ${round}...`);

      const verseType = round === 1 ? 'opening' : round === 2 ? 'comeback' : 'final';

      // Bot 1 verse
      const bot1Verse = await generateVerse(
        bot1.name,
        bot1.personality,
        bot2.name,
        verseType,
        allVerses.filter(v => v.bot_id === bot1.id).map(v => v.verse_text)
      );

      const bot1Score = await judgeVerse(bot1Verse, bot1.name, bot2.name);

      // Bot 2 verse
      const bot2Verse = await generateVerse(
        bot2.name,
        bot2.personality,
        bot1.name,
        verseType,
        allVerses.filter(v => v.bot_id === bot2.id).map(v => v.verse_text)
      );

      const bot2Score = await judgeVerse(bot2Verse, bot2.name, bot1.name);

      rounds.push({
        round_number: round,
        bot1_verse: bot1Verse,
        bot1_score: bot1Score,
        bot2_verse: bot2Verse,
        bot2_score: bot2Score
      });

      allVerses.push(
        { bot_id: bot1.id, verse_text: bot1Verse, score: bot1Score, round },
        { bot_id: bot2.id, verse_text: bot2Verse, score: bot2Score, round }
      );
    }

    // Calculate total scores
    const bot1TotalScore = rounds.reduce((sum, r) => sum + r.bot1_score, 0);
    const bot2TotalScore = rounds.reduce((sum, r) => sum + r.bot2_score, 0);

    // Determine winner
    let winnerId = null;
    let isDraw = false;

    if (bot1TotalScore > bot2TotalScore) {
      winnerId = bot1.id;
    } else if (bot2TotalScore > bot1TotalScore) {
      winnerId = bot2.id;
    } else {
      isDraw = true;
    }

    // Calculate ELO changes
    const eloChanges = calculateELO(
      winnerId === bot1.id ? bot1.elo_rating : bot2.elo_rating,
      winnerId === bot2.id ? bot2.elo_rating : bot1.elo_rating,
      isDraw
    );

    const bot1EloChange = winnerId === bot1.id ? eloChanges.winnerChange :
                          winnerId === bot2.id ? eloChanges.loserChange :
                          eloChanges.winnerChange;

    const bot2EloChange = winnerId === bot2.id ? eloChanges.winnerChange :
                          winnerId === bot1.id ? eloChanges.loserChange :
                          eloChanges.loserChange;

    // Save battle to database
    const { data: battle, error: battleError } = await supabase
      .from('battles')
      .insert({
        bot1_id: bot1.id,
        bot2_id: bot2.id,
        winner_id: winnerId,
        bot1_score: bot1TotalScore,
        bot2_score: bot2TotalScore,
        battle_type: 'ranked',
        status: 'completed',
        total_rounds: 3,
        elo_change: Math.abs(bot1EloChange),
        completed_at: new Date().toISOString()
      })
      .select()
      .single();

    if (battleError) {
      console.error('Error saving battle:', battleError);
      throw battleError;
    }

    // Save verses (audio will be generated on-demand when viewing battle)
    const versesToInsert = allVerses.map(v => ({
      battle_id: battle.id,
      bot_id: v.bot_id,
      round_number: v.round,
      verse_type: v.round === 1 ? 'opening' : v.round === 2 ? 'comeback' : 'final',
      verse_text: v.verse_text,
      score: v.score,
      audio_url: null // Will be generated on-demand by /api/generate-audio.js
    }));

    await supabase.from('battle_verses').insert(versesToInsert);

    // Update bot stats and ELO
    await supabase.from('bots').update({
      elo_rating: bot1.elo_rating + bot1EloChange,
      total_battles: bot1.total_battles + 1,
      wins: bot1.wins + (winnerId === bot1.id ? 1 : 0),
      losses: bot1.losses + (winnerId === bot2.id ? 1 : 0),
      draws: bot1.draws + (isDraw ? 1 : 0)
    }).eq('id', bot1.id);

    await supabase.from('bots').update({
      elo_rating: bot2.elo_rating + bot2EloChange,
      total_battles: bot2.total_battles + 1,
      wins: bot2.wins + (winnerId === bot2.id ? 1 : 0),
      losses: bot2.losses + (winnerId === bot1.id ? 1 : 0),
      draws: bot2.draws + (isDraw ? 1 : 0)
    }).eq('id', bot2.id);

    // TODO: Update owner stats with proper counter increment
    // For now, skipping stats update to avoid supabase.raw() issue

    console.log(`✅ Battle complete! Winner: ${winnerId ? (winnerId === bot1.id ? bot1.name : bot2.name) : 'DRAW'}`);

    // Return battle results
    return res.status(200).json({
      success: true,
      battle_id: battle.id,
      winner_id: winnerId,
      is_draw: isDraw,
      bot1: {
        id: bot1.id,
        name: bot1.name,
        score: bot1TotalScore,
        elo_change: bot1EloChange,
        new_elo: bot1.elo_rating + bot1EloChange
      },
      bot2: {
        id: bot2.id,
        name: bot2.name,
        score: bot2TotalScore,
        elo_change: bot2EloChange,
        new_elo: bot2.elo_rating + bot2EloChange
      },
      rounds
    });

  } catch (error) {
    console.error('Battle error:', error);
    return res.status(500).json({
      error: 'Battle failed',
      message: error.message
    });
  }
}
