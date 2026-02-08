/**
 * Test endpoint to verify environment variables
 * GET /api/test-env
 */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const replicateKey = process.env.REPLICATE_API_KEY;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  return res.status(200).json({
    replicate_key_exists: !!replicateKey,
    replicate_key_length: replicateKey ? replicateKey.length : 0,
    replicate_key_starts_with: replicateKey ? replicateKey.substring(0, 5) : 'none',
    replicate_key_ends_with: replicateKey ? replicateKey.substring(replicateKey.length - 5) : 'none',
    replicate_key_has_newline: replicateKey ? replicateKey.includes('\n') : false,
    supabase_url_exists: !!supabaseUrl,
    supabase_key_exists: !!supabaseKey
  });
}
