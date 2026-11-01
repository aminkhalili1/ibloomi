// Apply mobile dropdown styling to inner pages without changing the site's CSS file.
(() => {
  const style = document.createElement('style');
  style.id = 'ibloomi-inner-mobile-nav';
  style.textContent = "\n\n/* =========================================================\n   iBloomi | unified mobile menu for INNER PAGES only.\n   Home page keeps its existing dedicated Hero navigation.\n   ========================================================= */\n@media (max-width: 768px) {\n  body:not(:has(> .hero)) .nav-wrapper {\n    position: sticky !important;\n    top: 0;\n    z-index: 1200;\n    overflow: visible !important;\n    background: #fff !important;\n    box-shadow: 0 1px 10px rgba(13,27,94,.045) !important;\n  }\n  body:not(:has(> .hero)) .nav-wrapper .nav-toggle {\n    display: flex !important;\n    justify-content: center;\n    align-items: center;\n    width: 44px;\n    height: 44px;\n    padding: 10px;\n    gap: 5px;\n    border: 0;\n    border-radius: 12px;\n    background: transparent !important;\n    box-shadow: none !important;\n    -webkit-tap-highlight-color: transparent;\n  }\n  body:not(:has(> .hero)) .nav-wrapper .nav-toggle span {\n    width: 23px;\n    height: 2px;\n    flex: 0 0 2px;\n    background: #0D1B5E;\n    border-radius: 2px;\n    transition: transform .18s ease, opacity .18s ease;\n  }\n  body:not(:has(> .hero)) .nav-wrapper:has(.nav-links.open) .nav-toggle span:nth-child(1) {\n    transform: translateY(7px) rotate(45deg);\n  }\n  body:not(:has(> .hero)) .nav-wrapper:has(.nav-links.open) .nav-toggle span:nth-child(2) { opacity: 0; }\n  body:not(:has(> .hero)) .nav-wrapper:has(.nav-links.open) .nav-toggle span:nth-child(3) {\n    transform: translateY(-7px) rotate(-45deg);\n  }\n  body:not(:has(> .hero)) .nav-wrapper .nav-links {\n    position: absolute !important;\n    top: calc(100% + 8px) !important;\n    left: auto !important;\n    right: max(18px, env(safe-area-inset-right)) !important;\n    width: min(302px, calc(100vw - 36px)) !important;\n    max-height: min(420px, calc(100dvh - 115px));\n    display: none !important;\n    flex-direction: column !important;\n    align-items: stretch !important;\n    gap: 0 !important;\n    overflow-y: auto;\n    margin: 0 !important;\n    padding: 9px !important;\n    border: 1px solid #e7eaf0 !important;\n    border-radius: 17px !important;\n    background: #fff !important;\n    box-shadow: 0 16px 40px rgba(13,27,94,.13), 0 2px 8px rgba(13,27,94,.035) !important;\n    -webkit-overflow-scrolling: touch;\n    z-index: 1202;\n  }\n  body:not(:has(> .hero)) .nav-wrapper .nav-links.open {\n    display: flex !important;\n    animation: innerMobileNavIn .16s ease both;\n  }\n  body:not(:has(> .hero)) .nav-wrapper .nav-links li {\n    display: list-item;\n    width: 100%;\n    padding: 0 !important;\n    margin: 0 !important;\n  }\n  body:not(:has(> .hero)) .nav-wrapper .nav-links a {\n    position: relative;\n    display: flex !important;\n    align-items: center;\n    justify-content: space-between;\n    width: 100%;\n    min-height: 45px;\n    padding: 10px 13px !important;\n    background: transparent !important;\n    color: #0D1B5E !important;\n    border: 0 !important;\n    border-radius: 9px !important;\n    box-shadow: none !important;\n    text-shadow: none !important;\n    filter: none !important;\n    transform: none !important;\n    font-size: 15px !important;\n    font-weight: 600 !important;\n    line-height: 1.35 !important;\n  }\n  body:not(:has(> .hero)) .nav-wrapper .nav-links a::after {\n    content: '' !important;\n    position: static !important;\n    display: block !important;\n    width: 6px !important;\n    height: 6px !important;\n    flex: 0 0 6px;\n    border: 0 !important;\n    border-top: 1.5px solid #8893aa !important;\n    border-right: 1.5px solid #8893aa !important;\n    border-radius: 0 !important;\n    background: transparent !important;\n    transform: rotate(45deg) !important;\n    opacity: .75;\n  }\n  body:not(:has(> .hero)) .nav-wrapper .nav-links a:is(:hover, :focus-visible) {\n    background: #f3f8ed !important;\n  }\n  body:not(:has(> .hero)) .nav-wrapper .nav-links a:focus-visible,\n  body:not(:has(> .hero)) .nav-wrapper .nav-toggle:focus-visible {\n    outline: 2px solid #7DC51E;\n    outline-offset: -2px;\n  }\n}\n@keyframes innerMobileNavIn {\n  from { opacity: 0; transform: translateY(-6px) scale(.985); }\n  to { opacity: 1; transform: translateY(0) scale(1); }\n}\n@media (prefers-reduced-motion: reduce) {\n  body:not(:has(> .hero)) .nav-wrapper .nav-links.open { animation: none !important; }\n}\n";
  document.head.appendChild(style);
})();

// iBloomi | Main JavaScript
// One shared mobile navigation controller across all pages.

const navbar = document.getElementById('navbar');
if (navbar) {
  const updateNavbar = () => navbar.classList.toggle('scrolled', window.scrollY > 20);
  window.addEventListener('scroll', updateNavbar, { passive: true });
  updateNavbar();
}

const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');
const mobileViewport = window.matchMedia('(max-width: 768px)');

if (navbar && navToggle && navLinks) {
  navToggle.setAttribute('aria-controls', 'navLinks');

  const menuIsOpen = () => mobileViewport.matches && navLinks.classList.contains('open');
  const syncMenu = () => {
    const open = menuIsOpen();
    navToggle.setAttribute('aria-expanded', String(open));
    navToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    // Preserve the homepage's existing mobile-menu-open styles.
    navbar.classList.toggle('mobile-menu-open', open);
  };
  const closeMenu = (returnFocus = false) => {
    navLinks.classList.remove('open');
    syncMenu();
    if (returnFocus) navToggle.focus();
  };

  navToggle.addEventListener('click', () => {
    if (!mobileViewport.matches) return;
    navLinks.classList.toggle('open');
    syncMenu();
  });

  navLinks.addEventListener('click', event => {
    if (event.target.closest('a')) closeMenu();
  });

  // Outside tap closes the dropdown, but no page-wide overlay is added.
  document.addEventListener('pointerdown', event => {
    if (menuIsOpen() && !navbar.contains(event.target)) closeMenu();
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menuIsOpen()) closeMenu(true);
  });

  mobileViewport.addEventListener('change', () => closeMenu());
  syncMenu();
}

// Smooth scrolling for in-page anchors.
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (event) {
    const href = this.getAttribute('href');
    if (!href || href === '#') return;
    let target;
    try { target = document.querySelector(href); } catch { return; }
    if (!target) return;
    event.preventDefault();
    const top = target.getBoundingClientRect().top + window.scrollY - 80;
    window.scrollTo({ top, behavior: 'smooth' });
  });
});

// Existing reveal animations.
const revealElements = document.querySelectorAll('.feature-card, .step, .testimonial-card, .faq-item, .team-card');
if ('IntersectionObserver' in window) {
  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
  revealElements.forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(24px)';
    el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    revealObserver.observe(el);
  });
}

// Gallery image lightbox.
const galleryImages = document.querySelectorAll('.gallery-card img');
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightbox-img');
const lightboxClose = document.getElementById('lightbox-close');
if (galleryImages.length && lightbox && lightboxClose && lightboxImg) {
  galleryImages.forEach(img => img.addEventListener('click', () => {
    lightboxImg.src = img.src;
    lightbox.classList.add('active');
  }));
  lightboxClose.addEventListener('click', () => lightbox.classList.remove('active'));
  lightbox.addEventListener('click', event => {
    if (event.target === lightbox) lightbox.classList.remove('active');
  });
}
