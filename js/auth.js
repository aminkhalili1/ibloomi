/**
 * js/auth.js — iBloomi Authentication
 *
 * Load order in auth.html:
 *   1. supabase.min.js   (CDN)
 *   2. js/config.js      (exposes window.loadIbloomiConfig)
 *   3. js/auth.js        (this file — calls loadIbloomiConfig, then runs auth)
 */

(function () {
  'use strict';

  const BUILDER_URL = 'https://builder.ibloomi.nl';

  // ─── DOM helpers ─────────────────────────────────────────────────────────────
  const $ = id => document.getElementById(id);
  const show = el => { if (el) el.style.display = ''; };
  const hide = el => { if (el) el.style.display = 'none'; };

  function setLoading(btn, loading) {
    if (!btn) return;
    btn.disabled = loading;
    const spinner = btn.querySelector('.auth-spinner');
    const label   = btn.querySelector('.auth-btn-label');
    if (spinner) spinner.style.display = loading ? 'inline-block' : 'none';
    if (label)   label.style.opacity   = loading ? '0.6' : '1';
  }

  function extractErrorMessage(error) {
    if (!error) return '';
    // error.message is the standard path
    if (typeof error.message === 'string' && error.message.trim() !== '') {
      return error.message.trim();
    }
    // Some Supabase responses nest the message
    if (typeof error.msg === 'string' && error.msg.trim() !== '') {
      return error.msg.trim();
    }
    // error_description is used by some OAuth errors
    if (typeof error.error_description === 'string' && error.error_description.trim() !== '') {
      return error.error_description.trim();
    }
    // Fallback — never show raw objects
    return 'Something went wrong. Please try again.';
  }

  function showError(id, msg) {
    const el = $(id);
    if (!el) return;
    // Ensure msg is always a plain string, never an object
    const text = (typeof msg === 'string' && msg.trim() !== '') ? msg.trim() : '';
    el.textContent = text;
    el.style.display = text ? 'flex' : 'none';
  }

  function clearErrors() {
    document.querySelectorAll('.auth-error').forEach(el => {
      el.textContent = '';
      el.style.display = 'none';
    });
    document.querySelectorAll('.auth-field input').forEach(inp =>
      inp.classList.remove('input-error')
    );
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  }

  // ─── Redirect to builder with session tokens ─────────────────────────────────
  // Appends access_token, refresh_token, expires_at, token_type as a URL
  // fragment so the builder can call supabase.auth.getSessionFromUrl() or
  // parse window.location.hash to restore the session without a second login.
  async function redirectToBuilder(client) {
    try {
      const { data } = await client.auth.getSession();
      if (data && data.session) {
        const s = data.session;
        const params = new URLSearchParams({
          access_token:  s.access_token,
          refresh_token: s.refresh_token,
          expires_at:    String(s.expires_at),
          token_type:    s.token_type || 'bearer'
        });
        // Use hash fragment — never lands in server logs, matches Supabase convention
        window.location.href = BUILDER_URL + '#' + params.toString();
        return;
      }
    } catch (_) {}
    // Fallback: redirect without tokens (builder will show sign-in)
    window.location.href = BUILDER_URL;
  }

  // ─── Clear all Supabase auth storage ─────────────────────────────────────────
  function clearAuthStorage(client) {
    try { client.auth.signOut(); } catch (_) {}
    ['localStorage', 'sessionStorage'].forEach(function (storeName) {
      try {
        var store = window[storeName];
        Object.keys(store).forEach(function (key) {
          if (key.startsWith('sb-') || key.includes('supabase')) {
            store.removeItem(key);
          }
        });
      } catch (_) {}
    });
  }

  // ─── Session check ────────────────────────────────────────────────────────────
  // Never redirects on logout=true.
  // Never redirects on a stale/expired session — validates with getUser() first.
  async function checkExistingSession(client) {
    // Never auto-redirect if we are handling a logout
    if (new URLSearchParams(window.location.search).get('logout') === 'true') {
      return false;
    }
    try {
      const { data: sessionData } = await client.auth.getSession();
      if (!sessionData || !sessionData.session) return false;

      // Session object exists — verify it is still valid with getUser()
      const { data: userData, error: userError } = await client.auth.getUser();
      if (userError || !userData || !userData.user) {
        // Stale or invalid session — clear it and show the login form
        clearAuthStorage(client);
        return false;
      }

      // Session is confirmed valid — redirect with tokens
      await redirectToBuilder(client);
      return true;
    } catch (_) {}
    return false;
  }

  // ─── Auth state change (handles OAuth redirect return) ───────────────────────
  function listenAuthChanges(client) {
    client.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) redirectToBuilder(client);
    });
  }

  // ─── Google OAuth ─────────────────────────────────────────────────────────────
  async function handleGoogle(client) {
    clearErrors();
    const btn = $('btn-google');
    setLoading(btn, true);
    const { error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/auth.html' }
    });
    if (error) {
      setLoading(btn, false);
      showError('error-google', extractErrorMessage(error) || 'Google sign-in failed. Please try again.');
    }
  }

  // ─── Email Sign Up ────────────────────────────────────────────────────────────
  async function handleSignUp(client) {
    clearErrors();
    const email    = $('signup-email').value.trim();
    const password = $('signup-password').value;
    const confirm  = $('signup-confirm').value;
    let invalid    = false;

    if (!isValidEmail(email)) {
      $('signup-email').classList.add('input-error');
      showError('error-signup-email', 'Please enter a valid email address.');
      invalid = true;
    }
    if (password.length < 6) {
      $('signup-password').classList.add('input-error');
      showError('error-signup-password', 'Password must be at least 6 characters.');
      invalid = true;
    }
    if (password !== confirm) {
      $('signup-confirm').classList.add('input-error');
      showError('error-signup-confirm', 'Passwords do not match.');
      invalid = true;
    }
    if (invalid) return;

    const btn = $('btn-signup');
    setLoading(btn, true);
    const { data: signUpData, error } = await client.auth.signUp({ email, password });
    setLoading(btn, false);

    if (error) { showError('error-signup-general', extractErrorMessage(error)); return; }

    // If Supabase returns a session immediately (email confirmation disabled),
    // redirect to the builder with tokens. Otherwise show the confirmation message.
    if (signUpData && signUpData.session) {
      await redirectToBuilder(client);
      return;
    }

    $('signup-panel').innerHTML = `
      <div class="auth-success">
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <circle cx="24" cy="24" r="22" stroke="#7DC51E" stroke-width="2"/>
          <path d="M13 24l8 8 14-16" stroke="#7DC51E" stroke-width="2.5"
                stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <h3>Check your email</h3>
        <p>We sent a confirmation link to <strong>${email}</strong>.
           Click it to activate your account — you'll be redirected automatically.</p>
      </div>`;
  }

  // ─── Email Sign In ────────────────────────────────────────────────────────────
  async function handleSignIn(client) {
    clearErrors();
    const email    = $('signin-email').value.trim();
    const password = $('signin-password').value;
    let invalid    = false;

    if (!isValidEmail(email)) {
      $('signin-email').classList.add('input-error');
      showError('error-signin-email', 'Please enter a valid email address.');
      invalid = true;
    }
    if (!password) {
      $('signin-password').classList.add('input-error');
      showError('error-signin-password', 'Please enter your password.');
      invalid = true;
    }
    if (invalid) return;

    const btn = $('btn-signin');
    setLoading(btn, true);
    const { error } = await client.auth.signInWithPassword({ email, password });
    setLoading(btn, false);

    if (error) {
      const msg = extractErrorMessage(error);
      showError('error-signin-general',
        msg === 'Invalid login credentials'
          ? 'Incorrect email or password. Please try again.'
          : msg
      );
      return;
    }
    await redirectToBuilder(client);
  }

  // ─── Tabs ─────────────────────────────────────────────────────────────────────
  function initTabs() {
    document.querySelectorAll('.auth-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const t = tab.dataset.tab;
        document.querySelectorAll('.auth-tab').forEach(x =>
          x.classList.toggle('active', x.dataset.tab === t));
        document.querySelectorAll('.auth-panel').forEach(p =>
          p.classList.toggle('active', p.id === t + '-panel'));
        clearErrors();
      });
    });
  }

  function initLiveClear() {
    document.querySelectorAll('.auth-field input').forEach(inp => {
      inp.addEventListener('input', function () {
        this.classList.remove('input-error');
        const id = this.dataset.errorTarget;
        if (id) showError(id, '');
      });
    });
  }

  // ─── Init ─────────────────────────────────────────────────────────────────────
  async function init() {
    const loadingEl = $('auth-config-loading');
    const errorEl   = $('auth-config-error');
    const mainEl    = $('auth-main');

    show(loadingEl); hide(mainEl); hide(errorEl);

    try {
      await window.loadIbloomiConfig();
    } catch (err) {
      console.error('iBloomi config error:', err.message);
      hide(loadingEl); show(errorEl);
      return;
    }

    const cfg    = window.IBLOOMI_CONFIG;
    const client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);

    // ── Logout flow ────────────────────────────────────────────────────────────
    // Builder redirects here with ?logout=true when the user signs out.
    // Sign out of Supabase, wipe any cached auth data, clean the URL,
    // then fall through to show the auth form. Never redirect to the builder.
    if (new URLSearchParams(window.location.search).get('logout') === 'true') {
      clearAuthStorage(client);

      // Remove ?logout=true from the URL without triggering a page reload
      var cleanUrl = window.location.pathname +
        (window.location.hash ? window.location.hash : '');
      history.replaceState(null, '', cleanUrl);

      // Show auth form immediately — no session check, no builder redirect
      hide(loadingEl); show(mainEl);
      initTabs();
      initLiveClear();
      const g = $('btn-google');
      if (g) g.addEventListener('click', () => handleGoogle(client));
      const up = $('form-signup');
      if (up) up.addEventListener('submit', e => { e.preventDefault(); handleSignUp(client); });
      const in_ = $('form-signin');
      if (in_) in_.addEventListener('submit', e => { e.preventDefault(); handleSignIn(client); });
      return;
    }
    // ── End logout flow ────────────────────────────────────────────────────────

    // Handle existing session or OAuth redirect
    const redirected = await checkExistingSession(client);
    if (redirected) return;

    listenAuthChanges(client);

    hide(loadingEl); show(mainEl);

    initTabs();
    initLiveClear();

    const g = $('btn-google');
    if (g) g.addEventListener('click', () => handleGoogle(client));

    const up = $('form-signup');
    if (up) up.addEventListener('submit', e => { e.preventDefault(); handleSignUp(client); });

    const in_ = $('form-signin');
    if (in_) in_.addEventListener('submit', e => { e.preventDefault(); handleSignIn(client); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
