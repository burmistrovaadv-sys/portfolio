(() => {
  'use strict';

  /* ---------- device scale ----------
     Before and After must render at the same size, so each comparison block gets
     one factor derived from its narrowest column and its busiest rack. */
  // A live rack carries the prototype's own 440px viewport, a bezel only the 410px device.
  const DEV_W = 410, LIVE_W = 440, GAP = 14, K_MIN = 0.3, K_MAX = 0.62;

  function fitDevices() {
    document.querySelectorAll('.compare').forEach(cmp => {
      let k = Infinity;
      cmp.querySelectorAll('.rack:not(.rack--sm)').forEach(rack => {
        const avail = rack.clientWidth;
        const n = rack.querySelectorAll('.shot').length || 1;
        const w = rack.classList.contains('rack--live') ? LIVE_W : DEV_W;
        if (avail > 0) k = Math.min(k, (avail - GAP * (n - 1)) / (n * w));
      });
      if (!isFinite(k)) return;
      cmp.style.setProperty('--k', Math.min(K_MAX, Math.max(K_MIN, k)).toFixed(4));
    });
  }

  fitDevices();
  addEventListener('resize', fitDevices);
  if (document.fonts) document.fonts.ready.then(fitDevices);

  /* ---------- reveal on scroll ---------- */
  const reveals = document.querySelectorAll('.reveal');
  if (!window.IntersectionObserver || matchMedia('(prefers-reduced-motion: reduce)').matches) {
    reveals.forEach(el => el.classList.add('is-in'));
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    reveals.forEach(el => io.observe(el));
  }

  /* ---------- lightbox ---------- */
  const box = document.getElementById('lightbox');
  const body = box.querySelector('.lightbox__body');
  const cap = box.querySelector('.lightbox__cap');
  let lastFocus = null;

  function open(node, caption) {
    lastFocus = document.activeElement;
    body.replaceChildren(node);
    cap.textContent = caption || '';
    box.hidden = false;
    requestAnimationFrame(() => box.classList.add('is-open'));
    document.body.style.overflow = 'hidden';
    box.querySelector('.lightbox__close').focus();
  }

  function close() {
    box.classList.remove('is-open');
    document.body.style.overflow = '';
    setTimeout(() => { box.hidden = true; body.replaceChildren(); }, 200);
    if (lastFocus) lastFocus.focus();
  }

  box.querySelector('.lightbox__close').addEventListener('click', close);
  box.addEventListener('click', (e) => { if (e.target === box || e.target === body) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !box.hidden) close(); });

  document.querySelectorAll('img[data-zoom]').forEach(img => {
    img.addEventListener('click', () => {
      const full = new Image();
      full.src = img.currentSrc || img.src;
      full.alt = img.alt;
      open(full, img.alt);
    });
  });

  /* ---------- missing screenshots ----------
     A Before shot that hasn't been dropped into assets/ yet should name itself
     instead of showing a broken image. */
  document.querySelectorAll('.bezel img').forEach(img => {
    img.addEventListener('error', () => {
      const fig = img.closest('.shot');
      if (!fig) return;
      fig.classList.add('is-missing');
      const name = img.getAttribute('src').split('/').pop();
      img.closest('.bezel').textContent = 'нет файла\n' + name;
    });
  });

  document.querySelectorAll('[data-proto]').forEach(btn => {
    btn.addEventListener('click', () => {
      const frame = document.createElement('iframe');
      frame.src = btn.dataset.proto;
      frame.title = btn.dataset.protoTitle || 'Прототип';
      // The prototype auto-fits its own viewport, so give it room and let it scale.
      // Wide enough that the prototype's own screen-jump bar stays on one row.
      frame.width = 640;
      frame.height = Math.min(980, window.innerHeight - 110);
      frame.addEventListener('load', () => setTimeout(() => {
        if (frame.contentDocument && frame.contentDocument.body) unclipShadow(frame.contentDocument);
      }, 400));
      open(frame, btn.dataset.protoTitle || 'Прототип');
    });
  });

  /* ---------- prototype control ----------
     Both prototypes are the untouched Claude Design exports, so a given screen
     is reached the only way they expose: clicking their own screen-jump buttons
     inside the iframe. The bar is hidden from view, but a programmatic click
     still reaches React. */
  function protoDoc(wrap) {
    const frame = wrap.querySelector('iframe');
    return frame && frame.contentDocument && frame.contentDocument.body ? frame.contentDocument : null;
  }

  function hideNav(doc) {
    const anchor = [...doc.querySelectorAll('button')]
      .find(b => /↺ Повторить|Смена тона/.test(b.textContent));
    if (!anchor || !anchor.parentElement) return false;
    if (!doc.getElementById('case-tidy')) {
      const s = doc.createElement('style');
      s.id = 'case-tidy';
      s.textContent = '.case-hide{display:none!important}html,body{background:transparent!important}';
      doc.head.appendChild(s);
    }
    anchor.parentElement.classList.add('case-hide');
    return true;
  }

  function navButton(doc, label) {
    return [...doc.querySelectorAll('button')].find(b => b.textContent.trim() === label) || null;
  }

  /* The prototype centres its phone in the viewport, but the drop shadow it draws
     reaches further down than the phone does, so the iframe edge cuts it off.
     Nudge the whole thing up by the overflow, never past the slack above it. */
  // A shadow on a card inside the phone is already clipped by the screen, so only
  // elements that nothing crops can reach the iframe edge.
  function isCropped(el, doc) {
    for (let n = el.parentElement; n && n !== doc.body; n = n.parentElement) {
      if (getComputedStyle(n).overflow !== 'visible') return true;
    }
    return false;
  }

  function shadowBox(el) {
    const cs = getComputedStyle(el);
    if (cs.boxShadow === 'none') return null;
    const rect = el.getBoundingClientRect();
    const scale = el.offsetHeight ? rect.height / el.offsetHeight : 1;
    let down = 0, up = 0;
    cs.boxShadow.split(/,(?![^(]*\))/).forEach(part => {
      const n = (part.match(/-?[\d.]+px/g) || []).map(parseFloat);
      if (n.length < 2) return;
      const reach = (n[3] || 0) + (n[2] || 0) / 2;
      down = Math.max(down, n[1] + reach);
      up = Math.max(up, reach - n[1]);
    });
    return { bottom: rect.bottom + down * scale, top: rect.top - up * scale };
  }

  function unclipShadow(doc) {
    const root = doc.body && doc.body.firstElementChild;
    if (!root) return;
    root.style.top = '0px';
    const limit = doc.documentElement.clientHeight;
    let over = 0, slack = Infinity;
    doc.querySelectorAll('div').forEach(el => {
      if (isCropped(el, doc)) return;
      const box = shadowBox(el);
      if (!box) return;
      over = Math.max(over, box.bottom - limit + 2);
      slack = Math.min(slack, box.top);
    });
    if (over <= 0 || !isFinite(slack)) return;
    root.style.position = 'relative';
    root.style.top = -Math.min(over, Math.max(0, slack)) + 'px';
  }

  // The dc runtime transpiles on load, so the target button may not exist yet.
  function showScreen(wrap, label, token) {
    let tries = 0;
    (function attempt() {
      if (token && token() !== label) return;
      const doc = protoDoc(wrap);
      if (doc && hideNav(doc)) {
        const btn = navButton(doc, label);
        // The screen swaps with a transition, so settle the shadow after it lands.
        if (btn) { btn.click(); [60, 700].forEach(t => setTimeout(() => unclipShadow(doc), t)); return; }
      }
      if (++tries < 60) setTimeout(attempt, 150);
    })();
  }

  const protoFrames = [...document.querySelectorAll('iframe[src*="proto/"]')];
  function unclipAll() {
    protoFrames.forEach(f => {
      if (f.contentDocument && f.contentDocument.body) unclipShadow(f.contentDocument);
    });
  }
  protoFrames.forEach(f => f.addEventListener('load', () => setTimeout(() => unclipAll(), 400)));
  addEventListener('resize', unclipAll);

  document.querySelectorAll('.live[data-screen]').forEach(wrap => {
    showScreen(wrap, wrap.dataset.screen);
    wrap.querySelector('iframe').addEventListener('load', () => showScreen(wrap, wrap.dataset.screen));
  });

  /* ---------- before / after slider ---------- */
  document.querySelectorAll('[data-ba]').forEach(media => {
    const set = (clientX) => {
      const r = media.getBoundingClientRect();
      const x = Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100));
      media.style.setProperty('--x', x.toFixed(2) + '%');
    };
    let dragging = false;
    media.addEventListener('pointerdown', (e) => {
      dragging = true; media.setPointerCapture(e.pointerId); set(e.clientX); e.preventDefault();
    });
    media.addEventListener('pointermove', (e) => { if (dragging) set(e.clientX); });
    const stop = (e) => { dragging = false; if (media.hasPointerCapture(e.pointerId)) media.releasePointerCapture(e.pointerId); };
    media.addEventListener('pointerup', stop);
    media.addEventListener('pointercancel', stop);
  });

  /* ---------- scroll tour ---------- */
  const tour = document.getElementById('tour');
  if (tour) {
    const steps = [...tour.querySelectorAll('.step')];
    const frames = [...tour.querySelectorAll('.frame')];
    const nowEl = tour.querySelector('[data-tour="now"]');
    const totalEl = tour.querySelector('[data-tour="total"]');
    const openEl = tour.querySelector('.ctl__open');
    const prevEl = tour.querySelector('[data-tour="prev"]');
    const nextEl = tour.querySelector('[data-tour="next"]');
    const N = steps.length;

    tour.style.setProperty('--steps', N);
    totalEl.textContent = N;

    const PROTO = {
      ba: ['proto/onboarding.html', 'Onboarding — интерактивный прототип'],
      onb: ['proto/onboarding.html', 'Onboarding — интерактивный прототип'],
      set: ['proto/settings.html', 'Настройки стиля — интерактивный прототип'],
    };

    let index = -1;
    let want = null;

    function apply(i) {
      const step = steps[i];
      const frameName = step.dataset.frame;
      steps.forEach((s, k) => s.classList.toggle('is-on', k === i));
      frames.forEach(f => f.classList.toggle('is-on', f.dataset.frame === frameName));
      nowEl.textContent = i + 1;
      const [src, title] = PROTO[frameName];
      openEl.dataset.proto = src;
      openEl.dataset.protoTitle = title;
      prevEl.disabled = i === 0;
      nextEl.disabled = i === N - 1;

      want = step.dataset.nav || null;
      if (!want) return;
      const frame = frames.find(f => f.dataset.frame === frameName);
      showScreen(frame, want, () => want);
    }

    function settle() {
      const step = steps[Math.max(0, index)];
      if (!step || !step.dataset.nav) return;
      const frame = frames.find(f => f.dataset.frame === step.dataset.frame);
      showScreen(frame, step.dataset.nav, () => want);
    }

    function offsets() {
      const rect = tour.getBoundingClientRect();
      const top = window.scrollY + rect.top;
      return { top, dist: Math.max(1, tour.offsetHeight - window.innerHeight) };
    }

    function sync() {
      const { top, dist } = offsets();
      const p = Math.min(1, Math.max(0, (window.scrollY - top) / dist));
      const i = Math.min(N - 1, Math.max(0, Math.round(p * (N - 1))));
      if (i !== index) { index = i; apply(i); }
    }

    function goTo(i) {
      const { top, dist } = offsets();
      const target = Math.min(N - 1, Math.max(0, i));
      window.scrollTo({ top: top + (target / (N - 1)) * dist, behavior: 'smooth' });
    }

    prevEl.addEventListener('click', () => goTo(index - 1));
    nextEl.addEventListener('click', () => goTo(index + 1));

    let queued = false;
    addEventListener('scroll', () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => { queued = false; sync(); });
    }, { passive: true });
    addEventListener('resize', sync);
    frames.forEach(f => {
      const ifr = f.querySelector('iframe');
      if (ifr) ifr.addEventListener('load', settle);
    });
    sync();
  }

  /* ---------- reading progress ---------- */
  const bar = document.querySelector('.progress i');
  if (bar) {
    const paint = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.width = (max > 0 ? (window.scrollY / max) * 100 : 0).toFixed(2) + '%';
    };
    addEventListener('scroll', paint, { passive: true });
    addEventListener('resize', paint);
    paint();
  }

})();
