/* iBloomi cookie preferences v2: Google Analytics is loaded only after opt-in.
   No advertising, marketing or third-party personalisation tag is installed here. */
(function () {
  'use strict';
  if (window.__ibloomiConsentV2) return;
  window.__ibloomiConsentV2 = true;

  var GA_ID = 'G-70S9FK30TR';
  var KEY = 'ibloomi.analytics-consent.v1'; // Preserve decisions from previous consent module.
  var state = null;
  var gaLoaded = false;
  var dialog, banner, analyticsToggle, previousFocus;

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  window.gtag('consent', 'default', {
    analytics_storage: 'denied', ad_storage: 'denied',
    ad_user_data: 'denied', ad_personalization: 'denied'
  });

  try {
    var stored = window.localStorage.getItem(KEY);
    if (stored === 'accepted' || stored === 'rejected') state = stored;
  } catch (_) { /* No storage means no optional analytics until user opts in. */ }

  function startAnalytics() {
    if (gaLoaded) return;
    gaLoaded = true;
    window.gtag('consent', 'update', { analytics_storage: 'granted' });
    window.gtag('js', new Date());
    window.gtag('config', GA_ID);
    var script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA_ID);
    document.head.appendChild(script);
  }

  function removeGACookies() {
    // Best effort for first-party GA cookies. It cannot remove every third-party cookie.
    document.cookie.split(';').forEach(function (part) {
      var name = part.trim().split('=')[0];
      if (!/^_ga(?:_|$)/.test(name)) return;
      [null, location.hostname, '.ibloomi.nl'].forEach(function (domain) {
        var removal = name + '=; Max-Age=0; path=/; SameSite=Lax';
        if (domain) removal += '; domain=' + domain;
        document.cookie = removal;
      });
    });
  }

  function applyChoice(allowAnalytics) {
    var needsReload = gaLoaded && !allowAnalytics;
    state = allowAnalytics ? 'accepted' : 'rejected';
    try { window.localStorage.setItem(KEY, state); } catch (_) {}
    if (allowAnalytics) {
      startAnalytics();
    } else {
      window.gtag('consent', 'update', {
        analytics_storage: 'denied', ad_storage: 'denied',
        ad_user_data: 'denied', ad_personalization: 'denied'
      });
      removeGACookies();
    }
    hideDialog();
    render();
    if (needsReload) window.location.reload(); // Stop already-loaded GA on withdrawal.
  }

  function render() {
    if (!banner) return;
    banner.hidden = state !== null;
  }

  function showDialog() {
    if (!dialog) return;
    previousFocus = document.activeElement;
    analyticsToggle.checked = state === 'accepted';
    dialog.hidden = false;
    dialog.setAttribute('aria-hidden', 'false');
    document.body.classList.add('ib-cookie-dialog-open');
    analyticsToggle.focus();
  }

  function hideDialog() {
    if (!dialog || dialog.hidden) return;
    dialog.hidden = true;
    dialog.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('ib-cookie-dialog-open');
    if (previousFocus && previousFocus.isConnected && typeof previousFocus.focus === 'function') previousFocus.focus();
  }

  function setup() {
    if (document.getElementById('ib-cookie-banner')) return;

    banner = document.createElement('section');
    banner.id = 'ib-cookie-banner';
    banner.className = 'ib-cookie-banner';
    banner.setAttribute('role', 'region');
    banner.setAttribute('aria-label', 'Cookie choices');
    banner.innerHTML =
      '<div class="ib-cookie-copy">' +
        '<h2>Privacy preferences</h2>' +
        '<p>We use essential technologies for site functionality and security. With your permission, Google Analytics helps us understand website usage and improve iBloomi. Optional analytics stays off unless you agree. You can change your choice at any time. <a href="/cookies">Cookie Policy</a>.</p>' +
      '</div>' +
      '<div class="ib-cookie-actions">' +
        '<button type="button" class="ib-cookie-secondary" id="ib-cookie-reject">Refuse</button>' +
        '<button type="button" class="ib-cookie-secondary" id="ib-cookie-customize">Adjust settings</button>' +
        '<button type="button" class="ib-cookie-primary" id="ib-cookie-accept">Accept</button>' +
      '</div>';

    dialog = document.createElement('div');
    dialog.id = 'ib-cookie-modal';
    dialog.className = 'ib-cookie-modal';
    dialog.hidden = true;
    dialog.setAttribute('aria-hidden', 'true');
    dialog.innerHTML =
      '<div class="ib-cookie-backdrop" aria-hidden="true"></div>' +
      '<section class="ib-cookie-panel" role="dialog" aria-modal="true" aria-labelledby="ib-cookie-title" aria-describedby="ib-cookie-intro">' +
        '<div class="ib-cookie-panel-header">' +
          '<h2 id="ib-cookie-title">Your cookie preferences</h2>' +
          '<button type="button" class="ib-cookie-close" aria-label="Close cookie preferences">×</button>' +
        '</div>' +
        '<p id="ib-cookie-intro">Choose which optional technologies iBloomi may use. Essential functionality remains available when you reject analytics.</p>' +
        '<div class="ib-cookie-category">' +
          '<div><h3>Essential &amp; functional</h3>' +
          '<p>Needed for core website functionality, security, sign-in and saving your cookie choice where applicable. These cannot be switched off here.</p></div>' +
          '<span class="ib-cookie-always-on">Always active</span>' +
        '</div>' +
        '<div class="ib-cookie-category">' +
          '<div><h3>Analytics — Google Analytics</h3>' +
          '<p>Optional measurement of website visits and interactions, helping us understand usage and improve the experience. Google Analytics is not loaded until you consent.</p></div>' +
          '<label class="ib-cookie-switch">' +
            '<input type="checkbox" id="ib-cookie-analytics-toggle" aria-label="Allow Google Analytics" />' +
            '<span aria-hidden="true" class="ib-cookie-slider"></span>' +
          '</label>' +
        '</div>' +
        '<div class="ib-cookie-category ib-cookie-disabled">' +
          '<div><h3>Marketing &amp; advertising</h3>' +
          '<p>No marketing or advertising tracking is configured by this consent module. No marketing consent is requested.</p></div>' +
          '<span class="ib-cookie-not-in-use">Not in use</span>' +
        '</div>' +
        '<p class="ib-cookie-notice">You can change or withdraw consent through the Cookie Policy page. Read our <a href="/cookies">Cookie Policy</a> for details.</p>' +
        '<div class="ib-cookie-modal-actions">' +
          '<button type="button" class="ib-cookie-secondary" id="ib-cookie-modal-reject">Refuse</button>' +
          '<button type="button" class="ib-cookie-primary" id="ib-cookie-save">Save preferences</button>' +
        '</div>' +
      '</section>';

    document.body.appendChild(banner);
    document.body.appendChild(dialog);
    analyticsToggle = document.getElementById('ib-cookie-analytics-toggle');

    banner.querySelector('#ib-cookie-reject').addEventListener('click', function () { applyChoice(false); });
    banner.querySelector('#ib-cookie-accept').addEventListener('click', function () { applyChoice(true); });
    banner.querySelector('#ib-cookie-customize').addEventListener('click', showDialog);
    // Non-floating access is provided only from the Cookie Policy page.
    var manageLink = document.getElementById('ib-cookie-manage-link');
    if (manageLink) {
      manageLink.addEventListener('click', function (event) {
        event.preventDefault();
        showDialog();
      });
    }
    dialog.querySelector('#ib-cookie-save').addEventListener('click', function () { applyChoice(analyticsToggle.checked); });
    dialog.querySelector('#ib-cookie-modal-reject').addEventListener('click', function () { applyChoice(false); });
    dialog.querySelector('.ib-cookie-close').addEventListener('click', hideDialog);
    dialog.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.preventDefault(); hideDialog(); return; }
      if (e.key !== 'Tab') return;
      var items = Array.prototype.slice.call(dialog.querySelectorAll('button:not([disabled]),input:not([disabled]),a[href]'));
      var first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    render();
  }

  // If the consent choice already exists, GA can load as the current page begins.
  // The source script is deferred so DOM is parsed before the banner initializes.
  if (state === 'accepted') startAnalytics();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup);
  else setup();
})();
