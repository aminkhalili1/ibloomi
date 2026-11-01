
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

  if (!isHome) {
    document.body.classList.add('ib-inner-page');
    const style = document.createElement('style');
    style.id = 'ibloomi-inner-mobile-nav-v3';
    style.textContent = `
      @media screen and (max-width:768px) {
        body.ib-inner-page #navbar.nav-wrapper {
          position:sticky !important;top:0 !important;z-index:5000 !important;
          overflow:visible !important;background:#fff !important;
          border-bottom:1px solid #e2e6f0 !important;
        }
        body.ib-inner-page #navbar .nav.container {
          position:relative !important;display:flex !important;
          justify-content:space-between !important;align-items:center !important;
          min-height:68px !important;height:68px !important;overflow:visible !important;
        }
        body.ib-inner-page #navbar #navToggle {
          display:flex !important;align-items:center !important;justify-content:center !important;
          flex-direction:column !important;gap:5px !important;flex:0 0 44px !important;
          width:44px !important;height:44px !important;padding:9px !important;
          border:0 !important;border-radius:10px !important;background:transparent !important;
          box-shadow:none !important;position:relative !important;z-index:5002 !important;
          cursor:pointer !important;
        }
        body.ib-inner-page #navbar #navToggle span {
          display:block !important;width:23px !important;height:2px !important;
          min-height:2px !important;flex:0 0 2px !important;
          background:#0D1B5E !important;border-radius:3px !important;
          transform-origin:center !important;transition:transform .2s ease,opacity .2s ease !important;
        }
        body.ib-inner-page #navbar #navToggle[aria-expanded="true"] span:nth-child(1) {
          transform:translateY(7px) rotate(45deg) !important;
        }
        body.ib-inner-page #navbar #navToggle[aria-expanded="true"] span:nth-child(2) {
          opacity:0 !important;
        }
        body.ib-inner-page #navbar #navToggle[aria-expanded="true"] span:nth-child(3) {
          transform:translateY(-7px) rotate(-45deg) !important;
        }
        body.ib-inner-page #navbar #navLinks.nav-links {
          position:absolute !important;inset:auto 0 auto auto !important;
          top:calc(100% + 8px) !important;left:auto !important;right:0 !important;
          bottom:auto !important;width:min(302px,calc(100vw - 32px)) !important;
          max-width:302px !important;height:auto !important;min-height:0 !important;
          max-height:min(430px,calc(100dvh - 115px)) !important;
          margin:0 !important;padding:8px !important;
          display:none !important;flex-direction:column !important;
          flex-wrap:nowrap !important;justify-content:flex-start !important;
          align-items:stretch !important;gap:2px !important;
          overflow-x:hidden !important;overflow-y:auto !important;
          background:#fff !important;border:1px solid #e2e6f0 !important;
          border-radius:16px !important;box-shadow:0 12px 30px rgba(25,30,45,.12) !important;
          transform:none !important;opacity:1 !important;visibility:visible !important;
          list-style:none !important;z-index:5001 !important;
          -webkit-overflow-scrolling:touch;
        }
        body.ib-inner-page #navbar #navLinks.nav-links.open {
          display:flex !important;animation:ibMobileDropdown .18s ease-out both !important;
        }
        body.ib-inner-page #navbar #navLinks.nav-links > li {
          display:block !important;flex:none !important;width:100% !important;
          height:auto !important;margin:0 !important;padding:0 !important;
        }
        body.ib-inner-page #navbar #navLinks.nav-links > li > a {
          display:flex !important;align-items:center !important;
          width:100% !important;min-height:44px !important;
          padding:10px 13px !important;margin:0 !important;
          color:#0D1B5E !important;font:600 15px/1.4 'Noto Sans',sans-serif !important;
          background:transparent !important;border:0 !important;border-radius:9px !important;
          box-shadow:none !important;text-shadow:none !important;filter:none !important;
          transform:none !important;text-decoration:none !important;
          transition:background .16s ease !important;
        }
        body.ib-inner-page #navbar #navLinks.nav-links > li > a:active,
        body.ib-inner-page #navbar #navLinks.nav-links > li > a:focus-visible {
          background:#eef6e7 !important;outline:2px solid #7DC51E !important;outline-offset:-2px !important;
        }
        body.ib-inner-page #navbar #navLinks.nav-links > li > a::before,
        body.ib-inner-page #navbar #navLinks.nav-links > li > a::after {
          content:none !important;display:none !important;
        }
      }
      @keyframes ibMobileDropdown {from{opacity:0;transform:translateY(-5px)}to{opacity:1;transform:translateY(0)}}
      @media(prefers-reduced-motion:reduce) {
        body.ib-inner-page #navbar #navLinks.nav-links.open{animation:none !important}
      }
    `;
    document.head.appendChild(style);
  }

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
      if(isOpen() && !navbar.contains(e.target))close();
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
