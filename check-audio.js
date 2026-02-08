import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Read .env file
const envContent = fs.readFileSync('.env', 'utf-8');
const SUPABASE_URL = envContent.match(/SUPABASE_URL=(.*)/)?.[1];
const SUPABASE_ANON_KEY = envContent.match(/SUPABASE_ANON_KEY=(.*)/)?.[1];

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkAudioUrls() {
  const { data, error } = await supabase
    .from('battle_verses')
    .select('id, round_number, bot_id, score, audio_url, created_at')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('\n📊 Latest 10 battle verses:\n');
  data.forEach((verse, i) => {
    console.log(`${i + 1}. Round ${verse.round_number} | Score: ${verse.score}/10`);
    console.log(`   Audio URL: ${verse.audio_url || '❌ NULL (no audio)'}`);
    console.log(`   Created: ${new Date(verse.created_at).toLocaleString()}\n`);
  });
}

checkAudioUrls();
