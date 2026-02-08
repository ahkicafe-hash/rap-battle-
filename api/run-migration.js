/**
 * ONE-TIME Database Migration Runner
 * DELETE THIS FILE AFTER RUNNING!
 */

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  try {
    // Create Supabase client
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    // Try to insert a test row to check if columns exist
    // If they don't exist, we'll get an error
    const { data: testBattle, error: testError } = await supabase
      .from('battles')
      .select('current_round, dj_commentary')
      .limit(1)
      .single();

    if (!testError || (testError && testError.code !== 'PGRST116')) {
      // Columns already exist
      return res.status(200).json({
        success: true,
        message: 'Migration already completed! Columns exist.',
        note: 'You can delete api/run-migration.js now'
      });
    }

    // Columns don't exist - provide manual instructions
    return res.status(200).json({
      success: false,
      message: 'Manual migration required',
      instructions: 'The anon key does not have ALTER TABLE permissions. Please run this SQL manually in Supabase Dashboard:',
      sql: `
ALTER TABLE battles
ADD COLUMN IF NOT EXISTS current_round INTEGER DEFAULT 1;

ALTER TABLE battles
ADD COLUMN IF NOT EXISTS dj_commentary TEXT;
      `,
      dashboard_url: 'https://supabase.com/dashboard/project/fwunwkiejqkrldvsubgf/sql'
    });

  } catch (error) {
    return res.status(500).json({
      error: error.message,
      message: 'Please run the migration manually in Supabase Dashboard',
      sql: `
ALTER TABLE battles
ADD COLUMN IF NOT EXISTS current_round INTEGER DEFAULT 1;

ALTER TABLE battles
ADD COLUMN IF NOT EXISTS dj_commentary TEXT;
      `,
      dashboard_url: 'https://supabase.com/dashboard/project/fwunwkiejqkrldvsubgf/sql'
    });
  }
}
