/**
 * js/auth.js — iBloomi Authentication
 *
 * Load order in auth.html:
 * 1. supabase.min.js   (CDN)
 * 2. js/config.js      (exposes window.loadIbloomiConfig)
 * 3. js/auth.js       (this file — calls loadIbloomiConfig, then runs auth)
 */

(function () {
  'use strict';

  const BUILDER_URL = 'https://builder.ibloomi.nl';

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
      error.message.trim()
    ) {
      return error.message.trim();
    }

    if (
      typeof error.msg === 'string' &&
      error.msg.trim()
    ) {
      return error.msg.trim();
    }

    if (
      typeof error.error_description === 'string' &&
      error.error_description.trim()
    ) {
      return error.error_description.trim();
    }

    return 'Something went wrong. Please try again.';
  }

  function showError(id, msg) {
    const el = $(id);
    if (!el) return;

    const text =
      typeof msg === 'string' && msg.trim()
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

  /**
   * Redirect authenticated user to the Builder.
   *
   * The Builder receives the Supabase session through the URL hash.
   */
  async function redirectToBuilder(client) {
    try {
      const { data } = await client.auth.getSession();

      if (data && data.session) {
        const session = data.session;

        const params = new URLSearchParams({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          expires_at: String(session.expires_at),
          token_type: session.token_type || 'bearer'
        });

        window.location.href = `${BUILDER_URL}#${params.toString()}`;
        return;
      }
    } catch (error) {
      console.error(
        'Redirect session handoff failed:',
        error
      );
    }

    window.location.href = BUILDER_URL;
  }

  /**
   * Check whether the user already has an active Supabase session.
   */
  async function checkExistingSession(client) {
    try {
      const { data } = await client.auth.getSession();

      if (data && data.session) {
        await redirectToBuilder(client);
        return true;
      }
    } catch (_) {}

    return false;
  }

  /**
   * Handle Supabase email confirmation links.
   *
   * The email template uses:
   *
   * {{ .SiteURL }}/auth.html?token_hash={{ .TokenHash }}&type=email
   *
   * Supabase verifies the token using verifyOtp().
   */
  async function handleEmailConfirmation(client) {
    const params = new URLSearchParams(
      window.location.search
    );

    const tokenHash = params.get('token_hash');
    const type = params.get('type');

    // This is not an email-confirmation request.
    if (!tokenHash || type !== 'email') {
      return false;
    }

    console.log('[Auth] Email confirmation token detected');

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

        // Remove sensitive token from the browser URL.
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname
        );

        const mainEl = $('auth-main');
        const loadingEl = $('auth-config-loading');

        hide(loadingEl);
        show(mainEl);

        showError(
          'error-signin-general',
          'Email confirmation failed. Please request a new confirmation email and try again.'
        );

        return true;
      }

      console.log(
        '[Auth] Email confirmation successful:',
        !!data?.session
      );

      // Remove the sensitive token from the browser URL
      // before redirecting.
      window.history.replaceState(
        {},
        document.title,
        window.location.pathname
      );

      // After successful confirmation, redirect to Builder.
      await redirectToBuilder(client);

      return true;
    } catch (error) {
      console.error(
        '[Auth] Email confirmation exception:',
        error
      );

      window.history.replaceState(
        {},
        document.title,
        window.location.pathname
      );

      const mainEl = $('auth-main');
      const loadingEl = $('auth-config-loading');

      hide(loadingEl);
      show(mainEl);

      showError(
        'error-signin-general',
        'Email confirmation failed. Please try again.'
      );

      return true;
    }
  }

  /**
   * Listen for subsequent authentication state changes.
   */
  function listenAuthChanges(client) {
    client.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        redirectToBuilder(client);
      }
    });
  }

  /**
   * Google OAuth sign-in.
   */
  async function handleGoogle(client) {
    clearErrors();

    const btn = $('btn-google');
    setLoading(btn, true);

    const { error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo:
          window.location.origin + '/auth.html'
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

  /**
   * Email/password signup.
   */
  async function handleSignUp(client) {
    clearErrors();

    const email = $('signup-email').value.trim();
    const password = $('signup-password').value;
    const confirm = $('signup-confirm').value;

    let invalid = false;

    if (!isValidEmail(email)) {
      $('signup-email').classList.add('input-error');

      showError(
        'error-signup-email',
        'Please enter a valid email address.'
      );

      invalid = true;
    }

    if (password.length < 6) {
      $('signup-password').classList.add('input-error');

      showError(
        'error-signup-password',
        'Password must be at least 6 characters.'
      );

      invalid = true;
    }

    if (password !== confirm) {
      $('signup-confirm').classList.add('input-error');

      showError(
        'error-signup-confirm',
        'Passwords do not match.'
      );

      invalid = true;
    }

    if (invalid) return;

    const btn = $('btn-signup');
    setLoading(btn, true);

    const { data, error } = await client.auth.signUp({
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

    // If Supabase immediately returned a session,
    // the user does not need email confirmation.
    if (data && data.session) {
      await redirectToBuilder(client);
      return;
    }

    // Normal case when email confirmation is required.
    $('signup-panel').innerHTML = `
      <div class="auth-success">
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
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

  /**
   * Email/password sign-in.
   */
  async function handleSignIn(client) {
    clearErrors();

    const email = $('signin-email').value.trim();
    const password = $('signin-password').value;

    let invalid = false;

    if (!isValidEmail(email)) {
      $('signin-email').classList.add('input-error');

      showError(
        'error-signin-email',
        'Please enter a valid email address.'
      );

      invalid = true;
    }

    if (!password) {
      $('signin-password').classList.add('input-error');

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
      const msg = extractErrorMessage(error);

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

  /**
   * Initialize auth tabs.
   */
  function initTabs() {
    document
      .querySelectorAll('.auth-tab')
      .forEach(tab => {
        tab.addEventListener('click', () => {
          const t = tab.dataset.tab;

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
        });
      });
  }

  /**
   * Clear validation errors while typing.
   */
  function initLiveClear() {
    document
      .querySelectorAll('.auth-field input')
      .forEach(inp => {
        inp.addEventListener('input', function () {
          this.classList.remove('input-error');

          const id = this.dataset.errorTarget;

          if (id) {
            showError(id, '');
          }
        });
      });
  }

  /**
   * Initialize the authentication page.
   */
  async function init() {
    const loadingEl = $('auth-config-loading');
    const errorEl = $('auth-config-error');
    const mainEl = $('auth-main');

    show(loadingEl);
    hide(mainEl);
    hide(errorEl);

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

    const cfg = window.IBLOOMI_CONFIG;

    const client = window.supabase.createClient(
      cfg.supabaseUrl,
      cfg.supabaseAnonKey
    );

    /**
     * IMPORTANT:
     * Check email confirmation BEFORE checking
     * for an existing session or installing the
     * SIGNED_IN listener.
     */
    const confirmed =
      await handleEmailConfirmation(client);

    if (confirmed) return;

    const redirected =
      await checkExistingSession(client);

    if (redirected) return;

    listenAuthChanges(client);

    hide(loadingEl);
    show(mainEl);

    initTabs();
    initLiveClear();

    const googleBtn = $('btn-google');

    if (googleBtn) {
      googleBtn.addEventListener(
        'click',
        () => handleGoogle(client)
      );
    }

    const signupForm = $('form-signup');

    if (signupForm) {
      signupForm.addEventListener(
        'submit',
        e => {
          e.preventDefault();
          handleSignUp(client);
        }
      );
    }

    const signinForm = $('form-signin');

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

  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      init
    );
  } else {
    init();
  }
})();
