/**
 * js/config.js — iBloomi Supabase Configuration Loader
 *
 * Fetches the public Supabase config at runtime from the Vercel
 * serverless function at /api/config, which reads SUPABASE_URL and
 * SUPABASE_ANON_KEY from Vercel Environment Variables.
 *
 * No credentials are stored in this file.
 * No placeholders. No hardcoded values.
 */

window.IBLOOMI_CONFIG = null;

window.loadIbloomiConfig = async function () {
  const res = await fetch('/api/config');
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Config fetch failed (' + res.status + ')');
  }
  const data = await res.json();
  if (!data.supabaseUrl || !data.supabaseAnonKey) {
    throw new Error('Incomplete config from /api/config');
  }
  window.IBLOOMI_CONFIG = {
    supabaseUrl:     data.supabaseUrl,
    supabaseAnonKey: data.supabaseAnonKey
  };
};
