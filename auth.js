/**
 * iBloomi — auth.js
 *
 * Fetches Supabase public config from /api/config (Vercel serverless function),
 * then initialises the Supabase client and runs the full auth flow.
 *
 * Flow:
 *   1. Fetch /api/config  →  { supabaseUrl, supabaseAnonKey }
 *   2. createClient(url, key)
 *   3. Check existing session  →  redirect to builder if already logged in
 *   4. Listen for auth state changes  →  redirect on SIGNED_IN
 *   5. Wire up Google OAuth, email sign-in, email sign-up
 */

(function () {
  'use strict';

  const BUILDER_URL = 'https://builder.ibloomi.nl';

  // ─── DOM helpers ────────────────────────────────────────────────────────────
  const $ = id => document.getElementById(id);

  function show(el) { if (el) el.style.display = ''; }
  function hide(el) { if (el) el.style.display = 'none'; }

  function setLoading(btn, loading) {
    if (!btn) return;
    btn.disabled = loading;
    const spinner = btn.querySelector('.auth-spinner');
    const label   = btn.querySelector('.auth-btn-label');
    if (spinner) spinner.style.display = loading ? 'inline-block' : 'none';
    if (label)   label.style.opacity   = loading ? '0.6' : '1';
  }

  function showError(elementId, msg) {
    const el = $(elementId);
    if (!el) return;
    el.textContent = msg;
    el.style.display = msg ? 'flex' : 'none';
  }

  function clearErrors() {
    document.querySelectorAll('.auth-error').forEach(el => {
      el.textContent = '';
      el.style.display = 'none';
    });
    document.querySelectorAll('.auth-field input').forEach(inp => {
      inp.classList.remove('input-error');
    });
  }

  function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  }

  function redirectToBuilder() {
    window.location.href = BUILDER_URL;
  }

  // ─── Step 1: Fetch config from Vercel serverless function ───────────────────
  async function fetchConfig() {
    const res = await fetch('/api/config');
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || 'Failed to load configuration (' + res.status + ')');
    }
    const data = await res.json();
    if (!data.supabaseUrl || !data.supabaseAnonKey) {
      throw new Error('Incomplete configuration returned from /api/config');
    }
    return data;
  }

  // ─── Step 2: Create Supabase client ─────────────────────────────────────────
  function createSupabaseClient(supabaseUrl, supabaseAnonKey) {
    return window.supabase.createClient(supabaseUrl, supabaseAnonKey);
  }

  // ─── Step 3: Check existing session ─────────────────────────────────────────
  async function checkExistingSession(client) {
    try {
      const { data } = await client.auth.getSession();
      if (data && data.session) {
        redirectToBuilder();
        return true;
      }
    } catch (_) {}
    return false;
  }

  // ─── Step 4: Listen for auth state changes (handles OAuth redirect) ─────────
  function listenForAuthChanges(client) {
    client.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        redirectToBuilder();
      }
    });
  }

  // ─── Google OAuth ────────────────────────────────────────────────────────────
  async function handleGoogleLogin(client) {
    clearErrors();
    const btn = $('btn-google');
    setLoading(btn, true);

    const { error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/auth.html'
      }
    });

    if (error) {
      setLoading(btn, false);
      showError('error-google', error.message || 'Google sign-in failed. Please try again.');
    }
    // On success Supabase redirects the browser — no further JS needed.
  }

  // ─── Email Sign Up ───────────────────────────────────────────────────────────
  async function handleEmailSignUp(client) {
    clearErrors();
    const email    = $('signup-email').value.trim();
    const password = $('signup-password').value;
    const confirm  = $('signup-confirm').value;
    let hasError   = false;

    if (!validateEmail(email)) {
      $('signup-email').classList.add('input-error');
      showError('error-signup-email', 'Please enter a valid email address.');
      hasError = true;
    }
    if (password.length < 6) {
      $('signup-password').classList.add('input-error');
      showError('error-signup-password', 'Password must be at least 6 characters.');
      hasError = true;
    }
    if (password !== confirm) {
      $('signup-confirm').classList.add('input-error');
      showError('error-signup-confirm', 'Passwords do not match.');
      hasError = true;
    }
    if (hasError) return;

    const btn = $('btn-signup');
    setLoading(btn, true);

    const { error } = await client.auth.signUp({ email, password });
    setLoading(btn, false);

    if (error) {
      showError('error-signup-general', error.message || 'Sign up failed. Please try again.');
      return;
    }

    // Show confirmation — user needs to verify email before being signed in.
    // Supabase sends a verification link; clicking it fires onAuthStateChange → redirect.
    const panel = $('signup-panel');
    panel.innerHTML = `
      <div class="auth-success">
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <circle cx="24" cy="24" r="22" stroke="#7DC51E" stroke-width="2"/>
          <path d="M13 24l8 8 14-16" stroke="#7DC51E" stroke-width="2.5"
                stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <h3>Check your email</h3>
        <p>We've sent a confirmation link to <strong>${email}</strong>.
           Click it to activate your account — you'll be redirected automatically.</p>
      </div>`;
  }

  // ─── Email Sign In ────────────────────────────────────────────────────────────
  async function handleEmailSignIn(client) {
    clearErrors();
    const email    = $('signin-email').value.trim();
    const password = $('signin-password').value;
    let hasError   = false;

    if (!validateEmail(email)) {
      $('signin-email').classList.add('input-error');
      showError('error-signin-email', 'Please enter a valid email address.');
      hasError = true;
    }
    if (!password) {
      $('signin-password').classList.add('input-error');
      showError('error-signin-password', 'Please enter your password.');
      hasError = true;
    }
    if (hasError) return;

    const btn = $('btn-signin');
    setLoading(btn, true);

    const { error } = await client.auth.signInWithPassword({ email, password });
    setLoading(btn, false);

    if (error) {
      showError('error-signin-general',
        error.message === 'Invalid login credentials'
          ? 'Incorrect email or password. Please try again.'
          : error.message || 'Sign in failed. Please try again.'
      );
      return;
    }

    redirectToBuilder();
  }

  // ─── Tab switching ────────────────────────────────────────────────────────────
  function initTabs() {
    document.querySelectorAll('.auth-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const target = tab.dataset.tab;
        document.querySelectorAll('.auth-tab').forEach(t =>
          t.classList.toggle('active', t.dataset.tab === target)
        );
        document.querySelectorAll('.auth-panel').forEach(p =>
          p.classList.toggle('active', p.id === target + '-panel')
        );
        clearErrors();
      });
    });
  }

  // ─── Live error clearing ──────────────────────────────────────────────────────
  function initLiveClear() {
    document.querySelectorAll('.auth-field input').forEach(inp => {
      inp.addEventListener('input', function () {
        this.classList.remove('input-error');
        const errId = this.dataset.errorTarget;
        if (errId) showError(errId, '');
      });
    });
  }

  // ─── Main init ────────────────────────────────────────────────────────────────
  async function init() {
    const loadingEl = $('auth-config-loading');
    const errorEl   = $('auth-config-error');
    const mainEl    = $('auth-main');

    // Show spinner, hide card
    show(loadingEl);
    hide(mainEl);
    hide(errorEl);

    let config;
    try {
      config = await fetchConfig();
    } catch (err) {
      console.error('iBloomi auth config error:', err.message);
      hide(loadingEl);
      show(errorEl);
      return;
    }

    const client = createSupabaseClient(config.supabaseUrl, config.supabaseAnonKey);

    // Hide spinner, show card
    hide(loadingEl);
    show(mainEl);

    // Check for existing session (handles OAuth redirect return too)
    const redirected = await checkExistingSession(client);
    if (redirected) return;

    listenForAuthChanges(client);
    initTabs();
    initLiveClear();

    const btnGoogle = $('btn-google');
    if (btnGoogle) btnGoogle.addEventListener('click', () => handleGoogleLogin(client));

    const signupForm = $('form-signup');
    if (signupForm) signupForm.addEventListener('submit', e => { e.preventDefault(); handleEmailSignUp(client); });

    const signinForm = $('form-signin');
    if (signinForm) signinForm.addEventListener('submit', e => { e.preventDefault(); handleEmailSignIn(client); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
