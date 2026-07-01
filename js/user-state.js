/**
 * js/user-state.js — iBloomi Logged-in User State
 *
 * Loaded on main website pages (NOT auth.html).
 * Checks Supabase session, then:
 *   - If logged in: injects "Signed in as: email" + Sign Out button into the nav
 *   - If not logged in: does nothing (nav stays unchanged)
 *
 * Requires:
 *   1. supabase.min.js (CDN) loaded before this file
 *   2. js/config.js loaded before this file (sets window.loadIbloomiConfig)
 */

(function () {
  'use strict';

  async function init() {
    // Load Supabase config via the same mechanism auth.js uses
    if (typeof window.loadIbloomiConfig !== 'function') return;

    let cfg;
    try {
      await window.loadIbloomiConfig();
      cfg = window.IBLOOMI_CONFIG;
    } catch (_) {
      return; // Config unavailable — fail silently on main pages
    }

    if (!cfg || !cfg.supabaseUrl || !cfg.supabaseAnonKey) return;

    const client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);

    let session = null;
    try {
      const { data } = await client.auth.getSession();
      session = data && data.session ? data.session : null;
    } catch (_) {
      return;
    }

    if (!session) return;

    // User is logged in — inject the user pill into the nav
    const email = session.user && session.user.email ? session.user.email : '';
    injectUserPill(email, client);

    // Keep in sync if the user signs out in another tab
    client.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        window.location.href = 'auth.html?logout=true';
      }
    });
  }

  function injectUserPill(email, client) {
    // Find the nav-links ul — works on all pages
    const navLinks = document.getElementById('navLinks');
    if (!navLinks) return;

    // Build the user pill element
    const li = document.createElement('li');
    li.className = 'nav-user-pill';
    li.innerHTML =
      '<span class="nav-user-email">' +
        '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true" style="flex-shrink:0;">' +
          '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>' +
          '<circle cx="12" cy="7" r="4"/>' +
        '</svg>' +
        '<span class="nav-user-email-text">' + escapeHtml(email) + '</span>' +
      '</span>' +
      '<button class="nav-signout-btn" id="nav-signout-btn" type="button">Sign Out</button>';

    navLinks.appendChild(li);

    // Wire sign-out
    document.getElementById('nav-signout-btn').addEventListener('click', async function () {
      this.disabled = true;
      this.textContent = 'Signing out…';
      try {
        await client.auth.signOut();
      } catch (_) {}
      window.location.href = 'auth.html?logout=true';
    });
  }

  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // Run after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
