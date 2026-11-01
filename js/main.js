// iBloomi - shared script; navigation uses one single controller.
// Homepage keeps its own CSS/overlay. Inner pages use ib-inner-page rules.
const navbar = document.getElementById('navbar');
const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');
const mobileViewport = window.matchMedia('(max-width: 768px)');
const isHomepage = !!document.querySelector('.hero');
if (!isHomepage) document.body.classList.add('ib-inner-page');

if (navbar) {
  const updateNav = () => navbar.classList.toggle('scrolled', window.scrollY > 20);
  updateNav();
  window.addEventListener('scroll', updateNav, {passive:true});
}

if (navbar && navToggle && navLinks) {
  navToggle.setAttribute('aria-controls', 'navLinks');
  const isOpen = () => mobileViewport.matches && navLinks.classList.contains('open');
  const sync = () => {
    const open = isOpen();
    navToggle.setAttribute('aria-expanded', String(open));
    navToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    navbar.classList.toggle('mobile-menu-open', open);
  };
  const close = (focus = false) => {
    navLinks.classList.remove('open');
    sync();
    if (focus) navToggle.focus();
  };
  navToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!mobileViewport.matches) return;
    navLinks.classList.toggle('open');
    sync();
  });
  navLinks.addEventListener('click', e => {
    if (e.target.closest('a')) close();
  });
  document.addEventListener('pointerdown', e => {
    if (isOpen() && !navbar.contains(e.target)) close();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && isOpen()) close(true);
  });
  mobileViewport.addEventListener('change', () => close());
  sync();
}

// Smooth in-page anchor navigation.
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    const href = this.getAttribute('href');
    if (!href || href === '#') return;
    let target;
    try {target = document.querySelector(href);} catch {return;}
    if (!target) return;
    e.preventDefault();
    const top = target.getBoundingClientRect().top + window.scrollY - 80;
    window.scrollTo({top, behavior:'smooth'});
  });
});

// Existing card entrance transitions.
const revealElements = document.querySelectorAll('.feature-card, .step, .testimonial-card, .faq-item, .team-card');
if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
        revealObserver.unobserve(entry.target);
      }
    });
  }, {threshold:0.1,rootMargin:'0px 0px -40px 0px'});
  revealElements.forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(24px)';
    el.style.transition = 'opacity .5s ease, transform .5s ease';
    revealObserver.observe(el);
  });
}

// Gallery lightbox remains operational.
const galleryImages = document.querySelectorAll('.gallery-card img');
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightbox-img');
const lightboxClose = document.getElementById('lightbox-close');
if (galleryImages.length && lightbox && lightboxImg && lightboxClose) {
  galleryImages.forEach(img => {
    img.addEventListener('click', () => {
      lightboxImg.src = img.src;
      lightbox.classList.add('active');
    });
  });
  lightboxClose.addEventListener('click', () => lightbox.classList.remove('active'));
  lightbox.addEventListener('click', e => {
    if (e.target === lightbox) lightbox.classList.remove('active');
  });
}
