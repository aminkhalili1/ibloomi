/**
 * /api/config.js — Vercel Serverless Function
 *
 * Serves the Supabase public configuration to the static frontend at runtime.
 * Vercel injects SUPABASE_URL and SUPABASE_ANON_KEY from Project → Settings → Environment Variables.
 *
 * These are the PUBLIC values (project URL + anon key) — safe to send to browsers.
 * The SERVICE_ROLE key must never be used here or anywhere in frontend code.
 *
 * Endpoint: GET /api/config
 * Response: { "supabaseUrl": "...", "supabaseAnonKey": "..." }
 */
export default function handler(req, res) {
  const supabaseUrl     = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    // Environment variables not set in Vercel dashboard
    res.status(500).json({
      error: 'Supabase configuration is not set. Add SUPABASE_URL and SUPABASE_ANON_KEY to Vercel Environment Variables.'
    });
    return;
  }

  // Cache for 5 minutes — these values never change per deployment,
  // but short TTL means a key rotation takes effect quickly.
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
  res.setHeader('Content-Type', 'application/json');

  res.status(200).json({
    supabaseUrl,
    supabaseAnonKey
  });
}
