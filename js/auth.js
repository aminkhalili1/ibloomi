/**
 * js/auth.js — iBloomi Authentication
 *
 * Load order in auth.html:
 *
 *   1. supabase.min.js   (CDN)
 *   2. js/config.js      (exposes window.loadIbloomiConfig)
 *   3. js/auth.js        (this file — calls loadIbloomiConfig, then runs auth)
 */

(function () {
  'use strict';

  const BUILDER_URL = 'https://builder.ibloomi.nl';

  // ─── DOM helpers ─────────────────────────────────────────────────────────────

  const $ = id => document.getElementById(id);

  const show = el => {
    if (el) el.style.display = '';
  };

  const hide = el => {
    if (el) el.style.display = 'none';
  };

  function setLoading(btn, loading) {
    if (!btn) return;

    btn.disabled = loading;

    const spinner = btn.querySelector('.auth-spinner');
    const label = btn.querySelector('.auth-btn-label');

    if (spinner) {
      spinner.style.display = loading ? 'inline-block' : 'none';
    }

    if (label) {
      label.style.opacity = loading ? '0.6' : '1';
    }
  }

  function extractErrorMessage(error) {
    if (!error) return '';

    if (
      typeof error.message === 'string' &&
      error.message.trim() !== ''
    ) {
      return error.message.trim();
    }

    if (
      typeof error.msg === 'string' &&
      error.msg.trim() !== ''
    ) {
      return error.msg.trim();
    }

    if (
      typeof error.error_description === 'string' &&
      error.error_description.trim() !== ''
    ) {
      return error.error_description.trim();
    }

    return 'Something went wrong. Please try again.';
  }

  function showError(id, msg) {
    const el = $(id);

    if (!el) return;

    const text =
      typeof msg === 'string' && msg.trim() !== ''
        ? msg.trim()
        : '';

    el.textContent = text;
    el.style.display = text ? 'flex' : 'none';
  }

  function clearErrors() {
    document.querySelectorAll('.auth-error').forEach(el => {
      el.textContent = '';
      el.style.display = 'none';
    });

    document
      .querySelectorAll('.auth-field input')
      .forEach(inp => inp.classList.remove('input-error'));
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  }

  // ─── Redirect to builder with session tokens ─────────────────────────────────

  // Sends access_token, refresh_token, expires_at and token_type
  // to the Builder using the URL hash.

  async function redirectToBuilder(client) {
    try {
      const { data } = await client.auth.getSession();

      if (data && data.session) {
        const s = data.session;

        const params = new URLSearchParams({
          access_token: s.access_token,
          refresh_token: s.refresh_token,
          expires_at: String(s.expires_at),
          token_type: s.token_type || 'bearer'
        });

        window.location.href =
          BUILDER_URL + '#' + params.toString();

        return;
      }
    } catch (error) {
      console.error(
        '[Auth] Redirect session handoff failed:',
        error
      );
    }

    // Fallback: Builder will show sign-in.
    window.location.href = BUILDER_URL;
  }

  // ─── Email Confirmation ──────────────────────────────────────────────────────

  /**
   * Handles Supabase email confirmation links.
   *
   * Expected URL:
   *
   * https://ibloomi.nl/auth.html?token_hash=XXXXX&type=email
   *
   * Supabase sends the user to this page with token_hash.
   * We must explicitly verify that token before attempting login.
   */

  async function handleEmailConfirmation(client) {
    const params = new URLSearchParams(window.location.search);

    const tokenHash = params.get('token_hash');
    const type = params.get('type');

    // No confirmation token → normal Auth flow.
    if (!tokenHash || type !== 'email') {
      return false;
    }

    console.log('[Auth] Email confirmation link detected.');

    try {
      const { data, error } = await client.auth.verifyOtp({
        token_hash: tokenHash,
        type: 'email'
      });

      if (error) {
        console.error(
          '[Auth] Email confirmation failed:',
          error
        );

        return false;
      }

      console.log('[Auth] Email confirmed successfully.');

      // verifyOtp should create a session.
      if (data && data.session) {
        await redirectToBuilder(client);
        return true;
      }

      // In case Supabase confirms the email but does not return
      // a session directly, try reading the current session.
      const { data: sessionData } =
        await client.auth.getSession();

      if (sessionData && sessionData.session) {
        await redirectToBuilder(client);
        return true;
      }

      console.warn(
        '[Auth] Email confirmed, but no session was returned.'
      );

      return false;
    } catch (error) {
      console.error(
        '[Auth] Unexpected email confirmation error:',
        error
      );

      return false;
    }
  }

  // ─── Clear all Supabase auth storage ─────────────────────────────────────────

  async function clearAuthStorage(client) {
    // Only call local signOut if there is an active session.
    try {
      const { data } = await client.auth.getSession();

      if (data && data.session) {
        await client.auth.signOut({
          scope: 'local'
        });
      }
    } catch (_) {}

    // Always wipe local storage keys.
    ['localStorage', 'sessionStorage'].forEach(function (storeName) {
      try {
        const store = window[storeName];

        Object.keys(store).forEach(function (key) {
          if (
            key.startsWith('sb-') ||
            key.includes('supabase')
          ) {
            store.removeItem(key);
          }
        });
      } catch (_) {}
    });
  }

  // ─── Session check ───────────────────────────────────────────────────────────

  async function checkExistingSession(client) {
    // Never auto-redirect if handling logout.
    if (
      new URLSearchParams(window.location.search).get(
        'logout'
      ) === 'true'
    ) {
      return false;
    }

    try {
      const { data: sessionData } =
        await client.auth.getSession();

      if (
        !sessionData ||
        !sessionData.session
      ) {
        return false;
      }

      // Verify that the session is still valid.
      const { data: userData, error: userError } =
        await client.auth.getUser();

      if (
        userError ||
        !userData ||
        !userData.user
      ) {
        await clearAuthStorage(client);
        return false;
      }

      // Valid session → redirect to Builder.
      await redirectToBuilder(client);

      return true;
    } catch (_) {}

    return false;
  }

  // ─── Auth state change ───────────────────────────────────────────────────────

  function listenAuthChanges(client) {
    client.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        redirectToBuilder(client);
      }
    });
  }

  // ─── Google OAuth ─────────────────────────────────────────────────────────────

  async function handleGoogle(client) {
    clearErrors();

    const btn = $('btn-google');

    setLoading(btn, true);

    const { error } =
      await client.auth.signInWithOAuth({
        provider: 'google',

        options: {
          redirectTo:
            window.location.origin + '/auth.html',

          queryParams: {
            prompt: 'select_account'
          }
        }
      });

    if (error) {
      setLoading(btn, false);

      showError(
        'error-google',
        extractErrorMessage(error) ||
          'Google sign-in failed. Please try again.'
      );
    }
  }

  // ─── Email Sign Up ────────────────────────────────────────────────────────────

  async function handleSignUp(client) {
    clearErrors();

    const email =
      $('signup-email').value.trim();

    const password =
      $('signup-password').value;

    const confirm =
      $('signup-confirm').value;

    let invalid = false;

    if (!isValidEmail(email)) {
      $('signup-email').classList.add(
        'input-error'
      );

      showError(
        'error-signup-email',
        'Please enter a valid email address.'
      );

      invalid = true;
    }

    if (password.length < 6) {
      $('signup-password').classList.add(
        'input-error'
      );

      showError(
        'error-signup-password',
        'Password must be at least 6 characters.'
      );

      invalid = true;
    }

    if (password !== confirm) {
      $('signup-confirm').classList.add(
        'input-error'
      );

      showError(
        'error-signup-confirm',
        'Passwords do not match.'
      );

      invalid = true;
    }

    if (invalid) return;

    const btn = $('btn-signup');

    setLoading(btn, true);

    const {
      data: signUpData,
      error
    } = await client.auth.signUp({
      email,
      password
    });

    setLoading(btn, false);

    if (error) {
      showError(
        'error-signup-general',
        extractErrorMessage(error)
      );

      return;
    }

    // If Supabase returns a session immediately,
    // redirect directly to the Builder.
    if (
      signUpData &&
      signUpData.session
    ) {
      await redirectToBuilder(client);
      return;
    }

    // Email confirmation required.
    $('signup-panel').innerHTML = `
      <div class="auth-success">
        <svg
          width="48"
          height="48"
          viewBox="0 0 48 48"
          fill="none"
        >
          <circle
            cx="24"
            cy="24"
            r="22"
            stroke="#7DC51E"
            stroke-width="2"
          />

          <path
            d="M13 24l8 8 14-16"
            stroke="#7DC51E"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>

        <h3>Check your email</h3>

        <p>
          We sent a confirmation link to
          <strong>${email}</strong>.
          Click it to activate your account —
          you'll be redirected automatically.
        </p>
      </div>
    `;
  }

  // ─── Email Sign In ────────────────────────────────────────────────────────────

  async function handleSignIn(client) {
    clearErrors();

    const email =
      $('signin-email').value.trim();

    const password =
      $('signin-password').value;

    let invalid = false;

    if (!isValidEmail(email)) {
      $('signin-email').classList.add(
        'input-error'
      );

      showError(
        'error-signin-email',
        'Please enter a valid email address.'
      );

      invalid = true;
    }

    if (!password) {
      $('signin-password').classList.add(
        'input-error'
      );

      showError(
        'error-signin-password',
        'Please enter your password.'
      );

      invalid = true;
    }

    if (invalid) return;

    const btn = $('btn-signin');

    setLoading(btn, true);

    const { error } =
      await client.auth.signInWithPassword({
        email,
        password
      });

    setLoading(btn, false);

    if (error) {
      const msg =
        extractErrorMessage(error);

      showError(
        'error-signin-general',
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
    document
      .querySelectorAll('.auth-tab')
      .forEach(tab => {
        tab.addEventListener('click', () => {
          const t = tab.dataset.tab;

          document
            .querySelectorAll('.auth-tab')
            .forEach(x =>
              x.classList.toggle(
                'active',
                x.dataset.tab === t
              )
            );

          document
            .querySelectorAll('.auth-panel')
            .forEach(p =>
              p.classList.toggle(
                'active',
                p.id === t + '-panel'
              )
            );

          clearErrors();
        });
      });
  }

  // ─── Live input error clearing ────────────────────────────────────────────────

  function initLiveClear() {
    document
      .querySelectorAll('.auth-field input')
      .forEach(inp => {
        inp.addEventListener(
          'input',
          function () {
            this.classList.remove(
              'input-error'
            );

            const id =
              this.dataset.errorTarget;

            if (id) {
              showError(id, '');
            }
          }
        );
      });
  }

  // ─── Init ─────────────────────────────────────────────────────────────────────

  async function init() {
    const loadingEl =
      $('auth-config-loading');

    const errorEl =
      $('auth-config-error');

    const mainEl =
      $('auth-main');

    show(loadingEl);
    hide(mainEl);
    hide(errorEl);

    // ── Load iBloomi configuration ──────────────────────────────────────────────

    try {
      await window.loadIbloomiConfig();
    } catch (err) {
      console.error(
        'iBloomi config error:',
        err.message
      );

      hide(loadingEl);
      show(errorEl);

      return;
    }

    const cfg =
      window.IBLOOMI_CONFIG;

    const client =
      window.supabase.createClient(
        cfg.supabaseUrl,
        cfg.supabaseAnonKey
      );

    // ── Logout flow ─────────────────────────────────────────────────────────────

    if (
      new URLSearchParams(
        window.location.search
      ).get('logout') === 'true'
    ) {
      await clearAuthStorage(client);

      // Remove logout parameter.
      const cleanUrl =
        window.location.pathname +
        (window.location.hash
          ? window.location.hash
          : '');

      history.replaceState(
        null,
        '',
        cleanUrl
      );

      // Show Auth form.
      hide(loadingEl);
      show(mainEl);

      initTabs();
      initLiveClear();

      const g = $('btn-google');

      if (g) {
        g.addEventListener(
          'click',
          () => handleGoogle(client)
        );
      }

      const up = $('form-signup');

      if (up) {
        up.addEventListener(
          'submit',
          e => {
            e.preventDefault();
            handleSignUp(client);
          }
        );
      }

      const in_ = $('form-signin');

      if (in_) {
        in_.addEventListener(
          'submit',
          e => {
            e.preventDefault();
            handleSignIn(client);
          }
        );
      }

      return;
    }

    // ── Email confirmation flow ────────────────────────────────────────────────
    //
    // IMPORTANT:
    // This must happen BEFORE checkExistingSession().
    //
    // Supabase email confirmation URLs look like:
    //
    // /auth.html?token_hash=XXXXX&type=email
    //
    // The token must be verified first.
    //

    const urlParams =
      new URLSearchParams(
        window.location.search
      );

    const tokenHash =
      urlParams.get('token_hash');

    const tokenType =
      urlParams.get('type');

    if (
      tokenHash &&
      tokenType === 'email'
    ) {
      console.log(
        '[Auth] Processing email confirmation...'
      );

      const confirmed =
        await handleEmailConfirmation(
          client
        );

      if (confirmed) {
        return;
      }

      // Confirmation failed.
      // Remove the confirmation parameters
      // so they cannot be processed again.
      const cleanConfirmationUrl =
        window.location.pathname;

      history.replaceState(
        null,
        '',
        cleanConfirmationUrl
      );

      hide(loadingEl);
      show(mainEl);

      showError(
        'error-signin-general',
        'This email confirmation link is invalid or has expired. Please request a new confirmation email.'
      );

      initTabs();
      initLiveClear();

      const g = $('btn-google');

      if (g) {
        g.addEventListener(
          'click',
          () => handleGoogle(client)
        );
      }

      const up = $('form-signup');

      if (up) {
        up.addEventListener(
          'submit',
          e => {
            e.preventDefault();
            handleSignUp(client);
          }
        );
      }

      const in_ = $('form-signin');

      if (in_) {
        in_.addEventListener(
          'submit',
          e => {
            e.preventDefault();
            handleSignIn(client);
          }
        );
      }

      return;
    }

    // ── End email confirmation flow ────────────────────────────────────────────

    // ── Existing session ───────────────────────────────────────────────────────

    const redirected =
      await checkExistingSession(client);

    if (redirected) {
      return;
    }

    listenAuthChanges(client);

    // ── Show Auth UI ───────────────────────────────────────────────────────────

    hide(loadingEl);
    show(mainEl);

    initTabs();
    initLiveClear();

    const g = $('btn-google');

    if (g) {
      g.addEventListener(
        'click',
        () => handleGoogle(client)
      );
    }

    const up = $('form-signup');

    if (up) {
      up.addEventListener(
        'submit',
        e => {
          e.preventDefault();
          handleSignUp(client);
        }
      );
    }

    const in_ = $('form-signin');

    if (in_) {
      in_.addEventListener(
        'submit',
        e => {
          e.preventDefault();
          handleSignIn(client);
        }
      );
    }
  }

  // ─── Start ────────────────────────────────────────────────────────────────────

  if (
    document.readyState === 'loading'
  ) {
    document.addEventListener(
      'DOMContentLoaded',
      init
    );
  } else {
    init();
  }

})();
