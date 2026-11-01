// iBloomi | Main JavaScript
// One shared mobile navigation controller across all pages.

const navbar = document.getElementById('navbar');
// Marker avoids brittle :has() selectors and limits CSS to inner pages.
if (!document.querySelector('.hero')) document.body.classList.add('ib-inner-page');
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
