/**
 * js/auth.js — iBloomi Authentication
 *
 * Load order in auth.html:
 *
 *   1. supabase.min.js   (CDN)
 *   2. js/config.js      (exposes window.loadIbloomiConfig)
 *   3. js/auth.js        (this file)
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
      .forEach(inp => {
        inp.classList.remove('input-error');
      });
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  }

  // ─── Redirect to Builder ─────────────────────────────────────────────────────

  async function redirectToBuilder(client) {
    try {
      const { data, error } = await client.auth.getSession();

      if (error) {
        console.error('[Auth] getSession failed:', error);
      }

      if (data && data.session) {
        const session = data.session;

        const params = new URLSearchParams({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          expires_at: String(session.expires_at || ''),
          token_type: session.token_type || 'bearer'
        });

        console.log(
          '[Auth] Redirecting authenticated user to Builder.'
        );

        window.location.href =
          BUILDER_URL + '#' + params.toString();

        return true;
      }
    } catch (error) {
      console.error(
        '[Auth] Redirect session handoff failed:',
        error
      );
    }

    console.warn(
      '[Auth] No active session available for Builder redirect.'
    );

    window.location.href = BUILDER_URL;

    return false;
  }

  // ─── Email Confirmation ──────────────────────────────────────────────────────

  /**
   * Handles Supabase email confirmation links.
   *
   * Expected URL:
   *
   * https://ibloomi.nl/auth.html?token_hash=XXXXX&type=email
   *
   * The token_hash must be explicitly verified with Supabase.
   */

  async function handleEmailConfirmation(client) {
    const params = new URLSearchParams(
      window.location.search
    );

    const tokenHash = params.get('token_hash');
    const tokenType = params.get('type');

    if (!tokenHash || !tokenType) {
      return false;
    }

    console.log(
      '[Auth] Email confirmation link detected.'
    );

    console.log(
      '[Auth] Confirmation type:',
      tokenType
    );

    try {
      /*
       * Verify the token_hash explicitly.
       *
       * detectSessionInUrl is disabled below because
       * this function is responsible for processing
       * the confirmation URL.
       */

      const { data, error } =
        await client.auth.verifyOtp({
          token_hash: tokenHash,
          type: tokenType
        });

      if (error) {
        console.error(
          '[Auth] Email confirmation failed:',
          error
        );

        showError(
          'error-signin-general',
          'This email confirmation link is invalid or has expired. Please request a new confirmation email.'
        );

        return false;
      }

      console.log(
        '[Auth] Email confirmation verified successfully.'
      );

      /*
       * verifyOtp normally returns an authenticated session.
       */

      if (data && data.session) {
        console.log(
          '[Auth] Confirmation session received.'
        );

        /*
         * Remove token_hash and type from the browser URL
         * before redirecting.
         */

        window.history.replaceState(
          {},
          document.title,
          window.location.pathname
        );

        await redirectToBuilder(client);

        return true;
      }

      /*
       * Fallback:
       * Sometimes the session may already be stored even if
       * it was not returned directly from verifyOtp.
       */

      const {
        data: sessionData,
        error: sessionError
      } = await client.auth.getSession();

      if (
        !sessionError &&
        sessionData &&
        sessionData.session
      ) {
        console.log(
          '[Auth] Confirmation session found in storage.'
        );

        window.history.replaceState(
          {},
          document.title,
          window.location.pathname
        );

        await redirectToBuilder(client);

        return true;
      }

      console.error(
        '[Auth] Email was verified but no session was created.'
      );

      showError(
        'error-signin-general',
        'Your email was confirmed, but we could not create your session. Please sign in again.'
      );

      return false;

    } catch (error) {
      console.error(
        '[Auth] Unexpected email confirmation error:',
        error
      );

      showError(
        'error-signin-general',
        'We could not confirm your email. Please request a new confirmation email.'
      );

      return false;
    }
  }

  // ─── Clear Supabase Auth Storage ──────────────────────────────────────────────

  async function clearAuthStorage(client) {
    try {
      const { data } =
        await client.auth.getSession();

      if (data && data.session) {
        await client.auth.signOut({
          scope: 'local'
        });
      }
    } catch (_) {}

    [
      'localStorage',
      'sessionStorage'
    ].forEach(function (storeName) {
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

  // ─── Existing Session ────────────────────────────────────────────────────────

  async function checkExistingSession(client) {

    const params = new URLSearchParams(
      window.location.search
    );

    /*
     * Never auto-redirect during logout.
     */

    if (params.get('logout') === 'true') {
      return false;
    }

    /*
     * IMPORTANT:
     * Do not use this function before the email confirmation
     * flow has been processed.
     */

    try {
      const {
        data: sessionData,
        error: sessionError
      } = await client.auth.getSession();

      if (
        sessionError ||
        !sessionData ||
        !sessionData.session
      ) {
        return false;
      }

      /*
       * Verify that the session is still valid.
       */

      const {
        data: userData,
        error: userError
      } = await client.auth.getUser();

      if (
        userError ||
        !userData ||
        !userData.user
      ) {
        await clearAuthStorage(client);
        return false;
      }

      console.log(
        '[Auth] Existing valid session found.'
      );

      await redirectToBuilder(client);

      return true;

    } catch (error) {
      console.error(
        '[Auth] Existing session check failed:',
        error
      );
    }

    return false;
  }

  // ─── Auth State Changes ──────────────────────────────────────────────────────

  function listenAuthChanges(client) {
    client.auth.onAuthStateChange(
      (event, session) => {

        console.log(
          '[Auth] Auth state changed:',
          event
        );

        if (event === 'SIGNED_IN' && session) {
          redirectToBuilder(client);
        }
      }
    );
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
      password,

      options: {
        emailRedirectTo:
          window.location.origin + '/auth.html'
      }
    });

    setLoading(btn, false);

    if (error) {
      showError(
        'error-signup-general',
        extractErrorMessage(error)
      );

      return;
    }

    /*
     * If Supabase returns a session immediately,
     * redirect directly to Builder.
     */

    if (
      signUpData &&
      signUpData.session
    ) {
      await redirectToBuilder(client);
      return;
    }

    /*
     * Email confirmation required.
     */

    const signupPanel = $('signup-panel');

    if (signupPanel) {
      signupPanel.innerHTML = `
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

        tab.addEventListener(
          'click',
          () => {

            const t =
              tab.dataset.tab;

            document
              .querySelectorAll('.auth-tab')
              .forEach(x => {

                x.classList.toggle(
                  'active',
                  x.dataset.tab === t
                );

              });

            document
              .querySelectorAll('.auth-panel')
              .forEach(p => {

                p.classList.toggle(
                  'active',
                  p.id === t + '-panel'
                );

              });

            clearErrors();
          }
        );
      });
  }

  // ─── Live Input Error Clearing ────────────────────────────────────────────────

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

  // ─── Auth UI Initialization ───────────────────────────────────────────────────

  function initAuthUI(client) {

    initTabs();
    initLiveClear();

    const googleBtn =
      $('btn-google');

    if (googleBtn) {
      googleBtn.addEventListener(
        'click',
        () => handleGoogle(client)
      );
    }

    const signupForm =
      $('form-signup');

    if (signupForm) {
      signupForm.addEventListener(
        'submit',
        e => {
          e.preventDefault();
          handleSignUp(client);
        }
      );
    }

    const signinForm =
      $('form-signin');

    if (signinForm) {
      signinForm.addEventListener(
        'submit',
        e => {
          e.preventDefault();
          handleSignIn(client);
        }
      );
    }
  }

  // ─── Main Initialization ──────────────────────────────────────────────────────

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

    if (
      !cfg ||
      !cfg.supabaseUrl ||
      !cfg.supabaseAnonKey
    ) {

      console.error(
        '[Auth] Supabase configuration is missing.'
      );

      hide(loadingEl);
      show(errorEl);

      return;
    }

    // ── Create Supabase client ──────────────────────────────────────────────────

    const client =
      window.supabase.createClient(
        cfg.supabaseUrl,
        cfg.supabaseAnonKey,
        {
          auth: {
            persistSession: true,
            autoRefreshToken: true,

            /*
             * IMPORTANT:
             * Email confirmation is handled manually
             * with verifyOtp() below.
             *
             * Therefore Supabase must NOT try to process
             * token_hash automatically as well.
             */
            detectSessionInUrl: false
          }
        }
      );

    // ── Logout flow ─────────────────────────────────────────────────────────────

    const urlParams =
      new URLSearchParams(
        window.location.search
      );

    if (
      urlParams.get('logout') === 'true'
    ) {

      await clearAuthStorage(client);

      const cleanUrl =
        window.location.pathname;

      history.replaceState(
        null,
        '',
        cleanUrl
      );

      hide(loadingEl);
      show(mainEl);

      initAuthUI(client);

      return;
    }

    // ── EMAIL CONFIRMATION FLOW ────────────────────────────────────────────────
    //
    // This MUST happen BEFORE checking for an existing session.
    //
    // Expected:
    //
    // /auth.html?token_hash=XXXXX&type=email
    //

    const tokenHash =
      urlParams.get('token_hash');

    const tokenType =
      urlParams.get('type');

    if (
      tokenHash &&
      tokenType === 'email'
    ) {

      console.log(
        '[Auth] Email confirmation URL detected.'
      );

      /*
       * Do NOT check existing session first.
       * First verify the email token.
       */

      const confirmed =
        await handleEmailConfirmation(
          client
        );

      if (confirmed) {
        return;
      }

      /*
       * Confirmation failed.
       * Remove token parameters and show Auth UI.
       */

      history.replaceState(
        null,
        '',
        window.location.pathname
      );

      hide(loadingEl);
      show(mainEl);

      showError(
        'error-signin-general',
        'This email confirmation link is invalid or has expired. Please request a new confirmation email.'
      );

      initAuthUI(client);

      return;
    }

    // ── Existing Session ───────────────────────────────────────────────────────

    const redirected =
      await checkExistingSession(client);

    if (redirected) {
      return;
    }

    // ── Auth State Listener ─────────────────────────────────────────────────────

    listenAuthChanges(client);

    // ── Show Auth UI ────────────────────────────────────────────────────────────

    hide(loadingEl);
    show(mainEl);

    initAuthUI(client);
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
