/**
 * js/config.js — iBloomi Supabase Configuration
 *
 * Public Supabase Project URL + Publishable Key.
 * These are safe to expose in frontend code by design.
 *
 * This project must use the exact same Supabase Project URL and
 * Publishable Key as the Bouquet Builder (builder.ibloomi.nl) so
 * that sessions handed off between the two applications are valid
 * against the same Supabase project.
 */

window.IBLOOMI_CONFIG = {
  supabaseUrl: 'https://ihgtppiwxkuxjcfkjvki.supabase.co',
  supabaseAnonKey: 'sb_publishable_VMJhGBipry23nGOzFm-Vfg_M8SFqdtE'
};

// Kept for backward compatibility with js/auth.js, which calls
// window.loadIbloomiConfig() before reading window.IBLOOMI_CONFIG.
// Config is static here, so this simply resolves immediately.
window.loadIbloomiConfig = async function () {
  if (!window.IBLOOMI_CONFIG || !window.IBLOOMI_CONFIG.supabaseUrl || !window.IBLOOMI_CONFIG.supabaseAnonKey) {
    throw new Error('Supabase configuration is missing in js/config.js');
  }
  return window.IBLOOMI_CONFIG;
};
