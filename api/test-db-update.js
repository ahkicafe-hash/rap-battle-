/**
 * Test Database Update Permissions
 * GET /api/test-db-update?verse_id=xxx
 */
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { verse_id } = req.query;

  if (!verse_id) {
    return res.status(400).json({ error: 'Missing verse_id parameter' });
  }

  try {
    // Test 1: Read the verse
    const { data: verse, error: readError } = await supabase
      .from('battle_verses')
      .select('*')
      .eq('id', verse_id)
      .single();

    if (readError) {
      return res.status(500).json({
        test: 'read',
        success: false,
        error: readError
      });
    }

    // Test 2: Try to update the verse
    const testValue = `test:${Date.now()}`;
    const { data: updateData, error: updateError } = await supabase
      .from('battle_verses')
      .update({ audio_url: testValue })
      .eq('id', verse_id)
      .select();

    if (updateError) {
      return res.status(500).json({
        test: 'update',
        success: false,
        error: updateError,
        details: {
          message: updateError.message,
          code: updateError.code,
          hint: updateError.hint
        }
      });
    }

    // Test 3: Verify the update worked
    const { data: verifyVerse } = await supabase
      .from('battle_verses')
      .select('audio_url')
      .eq('id', verse_id)
      .single();

    return res.status(200).json({
      success: true,
      verse_before: verse,
      update_result: updateData,
      verse_after: verifyVerse,
      test_passed: verifyVerse?.audio_url === testValue
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
}
