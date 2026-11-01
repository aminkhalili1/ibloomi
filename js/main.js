
/* iBloomi shared main.js — mobile inner-page menu v3
   Self-contained mobile dropdown styling to avoid conflicting legacy rules.
   Does not change the homepage's custom navigation.
*/
(() => {
  'use strict';
  const navbar = document.getElementById('navbar');
  const navToggle = document.getElementById('navToggle');
  const navLinks = document.getElementById('navLinks');
  const media = window.matchMedia('(max-width: 768px)');
  const isHome = Boolean(document.querySelector('.hero'));

  // Inner pages use the same mobile dropdown design as the homepage.
  // All visual rules are maintained in css/style.css to prevent conflicting overrides.
  if (!isHome) document.body.classList.add('ib-inner-page');

  if (navbar) {
    const setScroll = () => navbar.classList.toggle('scrolled', window.scrollY > 20);
    setScroll();
    window.addEventListener('scroll', setScroll, { passive:true });
  }
  if (navbar && navToggle && navLinks) {
    navToggle.setAttribute('aria-controls','navLinks');
    const isOpen = () => media.matches && navLinks.classList.contains('open');
    const sync = () => {
      const open = isOpen();
      navToggle.setAttribute('aria-expanded',String(open));
      navToggle.setAttribute('aria-label',open ? 'Close menu' : 'Open menu');
      navbar.classList.toggle('mobile-menu-open',open);
    };
    const close = (focus = false) => {
      navLinks.classList.remove('open');sync();
      if(focus)navToggle.focus();
    };
    navToggle.addEventListener('click', () => {
      if(!media.matches)return;
      navLinks.classList.toggle('open');sync();
    });
    navLinks.addEventListener('click',e => {if(e.target.closest('a'))close();});
    document.addEventListener('pointerdown',e => {
      if(isOpen() && !navLinks.contains(e.target) && !navToggle.contains(e.target))close();
    });
    document.addEventListener('keydown',e => {
      if(e.key === 'Escape' && isOpen())close(true);
    });
    if(media.addEventListener)media.addEventListener('change',()=>close());
    else if(media.addListener)media.addListener(()=>close());
    sync();
  }

  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click',function(e){
      const href = this.getAttribute('href');
      if(!href || href==='#')return;
      let target;try{target=document.querySelector(href)}catch{return;}
      if(!target)return;
      e.preventDefault();
      const top=target.getBoundingClientRect().top+window.scrollY-80;
      window.scrollTo({top,behavior:'smooth'});
    });
  });

  const revealElements = document.querySelectorAll('.feature-card, .step, .testimonial-card, .faq-item, .team-card');
  if('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches){
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if(entry.isIntersecting){
          entry.target.style.opacity='1';entry.target.style.transform='translateY(0)';
          observer.unobserve(entry.target);
        }
      });
    },{threshold:0.1,rootMargin:'0px 0px -40px 0px'});
    revealElements.forEach(el => {
      el.style.opacity='0';el.style.transform='translateY(24px)';
      el.style.transition='opacity .5s ease,transform .5s ease';observer.observe(el);
    });
  }

  const lightbox=document.getElementById('lightbox');
  const lightboxImg=document.getElementById('lightbox-img');
  const lightboxClose=document.getElementById('lightbox-close');
  if(lightbox && lightboxImg && lightboxClose){
    document.querySelectorAll('.gallery-card img').forEach(img=>{
      img.addEventListener('click',()=>{
        lightboxImg.src=img.src;lightbox.classList.add('active');
      });
    });
    lightboxClose.addEventListener('click',()=>lightbox.classList.remove('active'));
    lightbox.addEventListener('click',e=>{if(e.target===lightbox)lightbox.classList.remove('active')});
  }
})();
