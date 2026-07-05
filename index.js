(function () {
    const root = document.documentElement;
    let saved = null;
    try { saved = localStorage.getItem('theme'); } catch (e) {}
    if (saved === 'dark') root.setAttribute('data-theme', 'dark');
    const toggle = document.getElementById('themeToggle');
    if (toggle) {
      toggle.addEventListener('click', () => {
        const dark = root.getAttribute('data-theme') === 'dark';
        if (dark) { root.removeAttribute('data-theme'); }
        else { root.setAttribute('data-theme', 'dark'); }
        try { localStorage.setItem('theme', dark ? 'light' : 'dark'); } catch (e) {}
      });
    }
  })();

  const navToggle = document.getElementById('navToggle');
  const navLinks = document.querySelector('.nav-links');
  if (navToggle) {
    navToggle.addEventListener('click', () => {
      const open = navLinks.style.display === 'flex';
      navLinks.style.display = open ? 'none' : 'flex';
      navLinks.style.position = 'absolute';
      navLinks.style.flexDirection = 'column';
      navLinks.style.top = '68px';
      navLinks.style.right = '22px';
      navLinks.style.background = 'var(--paper)';
      navLinks.style.padding = '20px 26px';
      navLinks.style.border = '1px solid var(--line)';
      navLinks.style.gap = '18px';
    });
    navLinks.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
      if (window.innerWidth <= 920) navLinks.style.display = 'none';
    }));
  }

  const nav = document.getElementById('nav');
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 20);
  });

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); revealObserver.unobserve(e.target); } });
  }, { threshold: 0.14 });
  document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

  const countObserver = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const el = e.target;
      const target = +el.dataset.count;
      const dur = 1400; const start = performance.now();
      const tick = (now) => {
        const p = Math.min((now - start) / dur, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(eased * target);
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      countObserver.unobserve(el);
    });
  }, { threshold: 0.6 });
  document.querySelectorAll('[data-count]').forEach(el => countObserver.observe(el));

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const heroPhoto = document.getElementById('heroPhoto');
  if (heroPhoto && !reduce) {
    setTimeout(() => heroPhoto.classList.remove('scanning'), 4800);
  }

/* ---------- gallery carousel ---------- */
(function () {
  const track = document.getElementById('galleryTrack');
  const viewport = document.getElementById('galleryViewport');
  if (!track || !viewport) return;

  // --- EDIT HERE ---
  // Put your images in a folder named "pictures" next to index.html,
  // named picture1, picture2 ... picture40 (either .jpg or .png works).
  const GALLERY_COUNT = 42;
  const GALLERY_PATH = 'pictures/';
  const GALLERY_NAME = 'picture';   // filename prefix, e.g. picture1
  const GALLERY_EXTS = ['jpg', 'png']; // tries .jpg first, then .png
  // -----------------

  const baseFor = (i) => GALLERY_PATH + GALLERY_NAME + i;

  function itemHTML(i) {
    const n = String(i).padStart(2, '0');
    const src = baseFor(i) + '.' + GALLERY_EXTS[0];
    return '<div class="gallery-item" data-index="' + i + '">' +
             '<span class="gi-num">' + n + '</span>' +
             '<img loading="lazy" alt="Gallery image ' + i + '" data-base="' + baseFor(i) + '" data-ext="0" src="' + src + '">' +
             '<span class="g-corner tl"></span><span class="g-corner tr"></span>' +
             '<span class="g-corner bl"></span><span class="g-corner br"></span>' +
           '</div>';
  }

  let html = '';
  for (let i = 1; i <= GALLERY_COUNT; i++) html += itemHTML(i);
  // duplicate the full set so the right-to-left loop is seamless
  track.innerHTML = html + html;

  // For each tile image, try the next extension on error, then fall back to the number placeholder
  track.querySelectorAll('.gallery-item img').forEach((img) => {
    img.addEventListener('error', () => {
      let ext = parseInt(img.dataset.ext, 10) + 1;
      if (ext < GALLERY_EXTS.length) {
        img.dataset.ext = ext;
        img.src = img.dataset.base + '.' + GALLERY_EXTS[ext];
      } else {
        img.style.display = 'none';
      }
    });
  });

  // ---------- movement engine (JS-driven) ----------
  const DURATION_SEC = 90;          // time to travel one full set (lower = faster)
  const RESUME_MS = 2500;           // resume auto-scroll this long after an arrow click
  const GLIDE_MS = 480;             // duration of one arrow nudge
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let W = 0;           // width of one full image set
  let pxPerMs = 0;     // auto-scroll speed
  let step = 320;      // how far one arrow click moves
  let offset = 0;      // current scroll position (unwrapped)
  let hovering = false;
  let autoPlay = !reduceMotion;
  let resumeTimer = null;

  let gliding = false, gStart = 0, gTarget = 0, gT0 = 0;

  function measure() {
    W = track.scrollWidth / 2;
    pxPerMs = W / (DURATION_SEC * 1000);
    const item = track.querySelector('.gallery-item');
    if (item) step = item.getBoundingClientRect().width + 20; // item width + gap
  }
  measure();
  window.addEventListener('resize', measure);
  window.addEventListener('load', measure);

  let last = null;
  function frame(ts) {
    if (last == null) last = ts;
    const dt = ts - last;
    last = ts;
    if (W > 0) {
      if (gliding) {
        const t = Math.min((ts - gT0) / GLIDE_MS, 1);
        const e = 1 - Math.pow(1 - t, 3);
        offset = gStart + (gTarget - gStart) * e;
        if (t >= 1) gliding = false;
      } else if (autoPlay && !hovering) {
        offset += pxPerMs * dt;
      }
      const disp = ((offset % W) + W) % W; // wrap seamlessly (content is duplicated)
      track.style.transform = 'translateX(' + (-disp) + 'px)';
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // Pause on hover over an actual image tile
  track.addEventListener('mouseover', (e) => { if (e.target.closest('.gallery-item')) hovering = true; });
  track.addEventListener('mouseout', (e) => {
    const to = e.relatedTarget;
    if (!to || !(to.closest && to.closest('.gallery-item'))) hovering = false;
  });

  // Arrow controls: nudge, stop, then resume after a few seconds
  function nudge(dir) {
    autoPlay = false;
    clearTimeout(resumeTimer);
    gStart = offset;
    gTarget = offset + dir * step;
    gT0 = performance.now();
    gliding = true;
    resumeTimer = setTimeout(() => { autoPlay = !reduceMotion; }, RESUME_MS);
  }
  const prevBtn = document.getElementById('galPrev');
  const nextBtn = document.getElementById('galNext');
  if (prevBtn) prevBtn.addEventListener('click', () => nudge(-1));
  if (nextBtn) nextBtn.addEventListener('click', () => nudge(1));

  // ---------- lightbox ----------
  const lb = document.getElementById('lightbox');
  const lbImg = document.getElementById('lbImg');
  const lbCount = document.getElementById('lbCount');
  const lbStage = lb ? lb.querySelector('.lb-stage') : null;

  let current = 1;
  let lbExt = 0;

  function show(i) {
    current = ((i - 1 + GALLERY_COUNT) % GALLERY_COUNT) + 1; // wrap 1..40
    lbExt = 0;
    lbStage.classList.remove('is-missing');
    lbImg.alt = 'Gallery image ' + current;
    lbImg.src = baseFor(current) + '.' + GALLERY_EXTS[0];
    lbCount.textContent = String(current).padStart(2, '0') + ' / ' + GALLERY_COUNT;
  }
  function openLightbox(i) {
    show(i);
    lb.classList.add('open');
    lb.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }
  function closeLightbox() {
    lb.classList.remove('open');
    lb.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  // Only open when the clicked tile has a real, loaded image
  track.addEventListener('click', (e) => {
    const item = e.target.closest('.gallery-item');
    if (!item) return;
    const img = item.querySelector('img');
    if (!img || img.style.display === 'none' || !img.complete || img.naturalWidth === 0) return;
    openLightbox(parseInt(item.dataset.index, 10) || 1);
  });

  if (lbImg) lbImg.addEventListener('error', () => {
    lbExt++;
    if (lbExt < GALLERY_EXTS.length) {
      lbImg.src = baseFor(current) + '.' + GALLERY_EXTS[lbExt];
    } else {
      lbStage.classList.add('is-missing');
    }
  });

  document.getElementById('lbClose').addEventListener('click', closeLightbox);
  document.getElementById('lbPrev').addEventListener('click', () => show(current - 1));
  document.getElementById('lbNext').addEventListener('click', () => show(current + 1));
  lb.addEventListener('click', (e) => { if (e.target === lb) closeLightbox(); });

  document.addEventListener('keydown', (e) => {
    if (!lb.classList.contains('open')) return;
    if (e.key === 'Escape') closeLightbox();
    else if (e.key === 'ArrowLeft') show(current - 1);
    else if (e.key === 'ArrowRight') show(current + 1);
  });
})();

/* ---------- capstone screen slider ---------- */
(function () {
  const media = document.getElementById('featMedia');
  if (!media) return;
  const slides = Array.from(media.querySelectorAll('.fm-slide'));
  const prev = document.getElementById('fmPrev');
  const next = document.getElementById('fmNext');
  const count = document.getElementById('fmCount');
  if (!slides.length) return;

  slides.forEach((img) => {
    img.addEventListener('error', () => { img.dataset.broken = '1'; render(); });
  });

  let idx = 0;
  const usable = () => slides.filter((s) => s.dataset.broken !== '1');

  function render() {
    const arr = usable();
    const many = arr.length > 1;
    [prev, next, count].forEach((el) => el && el.classList.toggle('fm-hidden', !many));
    slides.forEach((s) => s.classList.remove('is-active'));
    if (arr.length) {
      idx = ((idx % arr.length) + arr.length) % arr.length;
      arr[idx].classList.add('is-active');
      if (count) count.textContent = (idx + 1) + ' / ' + arr.length;
    }
  }
  function go(d) { const arr = usable(); if (arr.length) { idx = (idx + d + arr.length) % arr.length; render(); } }

  if (prev) prev.addEventListener('click', () => go(-1));
  if (next) next.addEventListener('click', () => go(1));
  render();
  window.addEventListener('load', render);
})();