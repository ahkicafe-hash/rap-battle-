/**
 * Generate Next Round for Battle
 * Vercel Serverless Function
 *
 * POST /api/next-round
 * Body: { battle_id: string }
 *
 * Generates the next round (2 or 3) for an in-progress battle
 */

import { createClient } from '@supabase/supabase-js';

// Use service role key for admin operations (bypasses RLS)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

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
  return Math.max(1, Math.min(10, score));
}

async function generateDJCommentary(roundNum, bot1Name, bot2Name, bot1Verse, bot2Verse, bot1Score, bot2Score, currentScores) {
  const prompts = {
    2: `You are DJ Claudius. Round 2 is done! Running scores: ${bot1Name} ${currentScores.bot1}, ${bot2Name} ${currentScores.bot2}

${bot1Name} (${bot1Score}/10):
"${bot1Verse}"

${bot2Name} (${bot2Score}/10):
"${bot2Verse}"

Write 2-3 sentences of commentary about these bars. Reference their wordplay and the momentum shift!`,

    3: `You are DJ Claudius. FINAL ROUND! Scores before this: ${bot1Name} ${currentScores.bot1}, ${bot2Name} ${currentScores.bot2}

${bot1Name} (${bot1Score}/10):
"${bot1Verse}"

${bot2Name} (${bot2Score}/10):
"${bot2Verse}"

Write 2-3 sentences of dramatic closing commentary. Reference their final bars and declare who won!`
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
          content: 'You are DJ Claudius, an energetic rap battle commentator. Reference specific bars from the verses. Keep it concise (2-3 sentences) and hype!'
        },
        {
          role: 'user',
          content: prompts[roundNum] || prompts[2]
        }
      ],
      temperature: 0.9,
      max_tokens: 150
    })
  });

  const data = await response.json();
  return data.choices[0].message.content.trim();
}

function calculateELO(winnerRating, loserRating, isDraw = false) {
  const K = 32;
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

export default async function handler(req, res) {
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
    const { battle_id } = req.body;

    if (!battle_id) {
      return res.status(400).json({ error: 'Missing battle_id' });
    }

    // Load battle with bots and verses
    const { data: battle, error: battleError } = await supabase
      .from('battles')
      .select('*, bot1:bots!battles_bot1_id_fkey(*), bot2:bots!battles_bot2_id_fkey(*), battle_verses(*)')
      .eq('id', battle_id)
      .single();

    if (battleError || !battle) {
      return res.status(404).json({ error: 'Battle not found' });
    }

    if (battle.status === 'completed') {
      return res.status(400).json({ error: 'Battle already completed' });
    }

    const nextRound = (battle.current_round || 1) + 1;

    if (nextRound > 3) {
      return res.status(400).json({ error: 'Battle has already reached final round' });
    }

    const bot1 = battle.bot1;
    const bot2 = battle.bot2;

    // Get previous verses for context
    const previousBot1Verses = battle.battle_verses
      .filter(v => v.bot_id === bot1.id)
      .map(v => v.verse_text);

    const previousBot2Verses = battle.battle_verses
      .filter(v => v.bot_id === bot2.id)
      .map(v => v.verse_text);

    const verseType = nextRound === 2 ? 'comeback' : 'final';

    // Generate verses
    const bot1Verse = await generateVerse(bot1.name, bot1.personality, bot2.name, verseType, previousBot1Verses);
    const bot1Score = await judgeVerse(bot1Verse, bot1.name, bot2.name);

    const bot2Verse = await generateVerse(bot2.name, bot2.personality, bot1.name, verseType, previousBot2Verses);
    const bot2Score = await judgeVerse(bot2Verse, bot2.name, bot1.name);

    // Calculate running scores
    const newBot1Total = battle.bot1_score + bot1Score;
    const newBot2Total = battle.bot2_score + bot2Score;

    // Generate DJ commentary (references the actual verses)
    const djCommentary = await generateDJCommentary(
      nextRound,
      bot1.name,
      bot2.name,
      bot1Verse,
      bot2Verse,
      bot1Score,
      bot2Score,
      { bot1: battle.bot1_score, bot2: battle.bot2_score }
    );

    // Determine if battle is complete
    const isComplete = nextRound === 3;
    let winnerId = null;
    let isDraw = false;

    if (isComplete) {
      if (newBot1Total > newBot2Total) {
        winnerId = bot1.id;
      } else if (newBot2Total > newBot1Total) {
        winnerId = bot2.id;
      } else {
        isDraw = true;
      }
    }

    // Calculate ELO if complete
    let bot1EloChange = 0;
    let bot2EloChange = 0;

    if (isComplete) {
      const eloChanges = calculateELO(
        winnerId === bot1.id ? bot1.elo_rating : bot2.elo_rating,
        winnerId === bot2.id ? bot2.elo_rating : bot1.elo_rating,
        isDraw
      );

      bot1EloChange = winnerId === bot1.id ? eloChanges.winnerChange :
                      winnerId === bot2.id ? eloChanges.loserChange :
                      eloChanges.winnerChange;

      bot2EloChange = winnerId === bot2.id ? eloChanges.winnerChange :
                      winnerId === bot1.id ? eloChanges.loserChange :
                      eloChanges.loserChange;
    }

    // Update battle
    await supabase
      .from('battles')
      .update({
        current_round: nextRound,
        bot1_score: newBot1Total,
        bot2_score: newBot2Total,
        status: isComplete ? 'completed' : 'in_progress',
        winner_id: winnerId,
        elo_change: Math.abs(bot1EloChange),
        dj_commentary: djCommentary,
        completed_at: isComplete ? new Date().toISOString() : null
      })
      .eq('id', battle_id);

    // Save verses
    await supabase.from('battle_verses').insert([
      {
        battle_id: battle.id,
        bot_id: bot1.id,
        round_number: nextRound,
        verse_type: verseType,
        verse_text: bot1Verse,
        score: bot1Score,
        audio_url: null
      },
      {
        battle_id: battle.id,
        bot_id: bot2.id,
        round_number: nextRound,
        verse_type: verseType,
        verse_text: bot2Verse,
        score: bot2Score,
        audio_url: null
      }
    ]);

    // Update ELO and stats if complete
    if (isComplete) {
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
    }

    console.log(`✅ Round ${nextRound} complete!`);

    return res.status(200).json({
      success: true,
      battle_id: battle.id,
      current_round: nextRound,
      status: isComplete ? 'completed' : 'in_progress',
      dj_commentary: djCommentary,
      bot1: {
        id: bot1.id,
        name: bot1.name,
        score: bot1Score,
        total_score: newBot1Total,
        verse: bot1Verse,
        elo_change: bot1EloChange,
        new_elo: bot1.elo_rating + bot1EloChange
      },
      bot2: {
        id: bot2.id,
        name: bot2.name,
        score: bot2Score,
        total_score: newBot2Total,
        verse: bot2Verse,
        elo_change: bot2EloChange,
        new_elo: bot2.elo_rating + bot2EloChange
      },
      winner_id: winnerId,
      is_draw: isDraw
    });

  } catch (error) {
    console.error('Next round error:', error);
    return res.status(500).json({
      error: 'Failed to generate next round',
      message: error.message
    });
  }
}
