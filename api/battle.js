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
 * Generate DJ Claudius commentary for a round
 */
async function generateDJCommentary(roundNum, bot1Name, bot2Name, bot1Verse, bot2Verse, bot1Score, bot2Score) {
  const prompts = {
    1: `You are DJ Claudius, the legendary battle rap commentator. ${bot1Name} and ${bot2Name} just opened Round 1. Write 2-3 sentences of hype commentary about their opening verses. Be energetic, witty, and set the stage for an epic battle.`,
    2: `You are DJ Claudius. Round 2 just finished! ${bot1Name} scored ${bot1Score}/10 and ${bot2Name} scored ${bot2Score}/10. Write 2-3 sentences of commentary hyping up the momentum and tension.`,
    3: `You are DJ Claudius. This is the FINAL ROUND! ${bot1Name} scored ${bot1Score}/10 and ${bot2Name} scored ${bot2Score}/10. Write 2-3 sentences of dramatic commentary about this climactic finale.`
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
          content: 'You are DJ Claudius, an energetic and charismatic rap battle commentator. Keep commentary exciting, concise (2-3 sentences), and focused on the action.'
        },
        {
          role: 'user',
          content: prompts[roundNum] || prompts[1]
        }
      ],
      temperature: 0.9,
      max_tokens: 100
    })
  });

  const data = await response.json();
  return data.choices[0].message.content.trim();
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

    // NEW FLOW: Only generate Round 1 initially
    const round = 1;
    const verseType = 'opening';

    // Bot 1 verse
    const bot1Verse = await generateVerse(
      bot1.name,
      bot1.personality,
      bot2.name,
      verseType,
      []
    );

    const bot1Score = await judgeVerse(bot1Verse, bot1.name, bot2.name);

    // Bot 2 verse
    const bot2Verse = await generateVerse(
      bot2.name,
      bot2.personality,
      bot1.name,
      verseType,
      []
    );

    const bot2Score = await judgeVerse(bot2Verse, bot2.name, bot1.name);

    // Generate DJ Claudius commentary for Round 1
    const djCommentary = await generateDJCommentary(
      round,
      bot1.name,
      bot2.name,
      bot1Verse,
      bot2Verse,
      bot1Score,
      bot2Score
    );

    // Save battle to database (status: 'in_progress', current_round: 1)
    const { data: battle, error: battleError } = await supabase
      .from('battles')
      .insert({
        bot1_id: bot1.id,
        bot2_id: bot2.id,
        winner_id: null,
        bot1_score: bot1Score,
        bot2_score: bot2Score,
        battle_type: 'ranked',
        status: 'in_progress',
        current_round: 1,
        total_rounds: 3,
        elo_change: 0,
        dj_commentary: djCommentary
      })
      .select()
      .single();

    if (battleError) {
      console.error('Error saving battle:', battleError);
      throw battleError;
    }

    // Save Round 1 verses
    await supabase.from('battle_verses').insert([
      {
        battle_id: battle.id,
        bot_id: bot1.id,
        round_number: 1,
        verse_type: 'opening',
        verse_text: bot1Verse,
        score: bot1Score,
        audio_url: null
      },
      {
        battle_id: battle.id,
        bot_id: bot2.id,
        round_number: 1,
        verse_type: 'opening',
        verse_text: bot2Verse,
        score: bot2Score,
        audio_url: null
      }
    ]);

    console.log(`✅ Round 1 complete!`);

    // Return Round 1 results
    return res.status(200).json({
      success: true,
      battle_id: battle.id,
      current_round: 1,
      status: 'in_progress',
      dj_commentary: djCommentary,
      bot1: {
        id: bot1.id,
        name: bot1.name,
        score: bot1Score,
        verse: bot1Verse
      },
      bot2: {
        id: bot2.id,
        name: bot2.name,
        score: bot2Score,
        verse: bot2Verse
      }
    });

  } catch (error) {
    console.error('Battle error:', error);
    return res.status(500).json({
      error: 'Battle failed',
      message: error.message
    });
  }
}
