/* ============================================================
   Apply page — Gameboy baseball game state machine
   ============================================================ */

(function () {
  const screen = document.getElementById('gbScreen');
  if (!screen) return;

  const slides = Array.from(screen.querySelectorAll('.gb-slide'));
  let idx = 0;
  const last = slides.length - 1; // 6 = home run screen

  const state = {
    name: '', email: '', city: '',
    position: '', years: '',
    bigwin: '', loss: '',
    co: '', pitch: '', jv: '',
    extra: ''
  };

  function show(n) {
    idx = Math.max(0, Math.min(last, n));
    slides.forEach((s, i) => s.classList.toggle('active', i === idx));
    if (idx === 5) renderReview();
    if (idx === 6) {
      const wn = document.getElementById('winName');
      if (wn) wn.textContent = (state.name || 'player').split(' ')[0];
    }
    // focus first input on the slide for nicer typing
    const firstInput = slides[idx].querySelector('input, textarea');
    if (firstInput && idx > 0 && idx < 5) {
      setTimeout(() => firstInput.focus({ preventScroll: true }), 60);
    }
  }

  function next() {
    captureCurrent();
    if (idx === 5) {
      submit();
      return;
    }
    show(idx + 1);
  }

  function prev() {
    captureCurrent();
    if (idx > 0 && idx < 6) show(idx - 1);
  }

  function captureCurrent() {
    const get = id => (document.getElementById(id) || {}).value || '';
    if (idx === 1) { state.name = get('f-name'); state.email = get('f-email'); state.city = get('f-city'); }
    if (idx === 2) { state.years = get('f-years'); }
    if (idx === 3) { state.bigwin = get('f-bigwin'); state.loss = get('f-loss'); }
    if (idx === 4) { state.co = get('f-co'); state.pitch = get('f-pitch'); state.jv = get('f-jv'); }
    if (idx === 5) { state.extra = get('f-extra'); }
  }

  // Position picker
  const pos = document.getElementById('positionChoices');
  if (pos) {
    pos.addEventListener('click', e => {
      const b = e.target.closest('.gb-choice');
      if (!b) return;
      pos.querySelectorAll('.gb-choice').forEach(x => x.classList.remove('selected'));
      b.classList.add('selected');
      state.position = b.dataset.val;
    });
  }

  function renderReview() {
    const r = document.getElementById('reviewSummary');
    if (!r) return;
    const line = (k, v) => `<div>★ <strong>${k}:</strong> ${v || '—'}</div>`;
    r.innerHTML = `
      ${line('NAME', state.name)}
      ${line('EMAIL', state.email)}
      ${line('CITY', state.city)}
      ${line('POSITION', state.position.toUpperCase())}
      ${line('YEARS', state.years)}
      ${line('COMPANY', state.co)}
      ${line('PITCH', state.pitch)}
      ${line('JV PARTNER', state.jv)}
    `;
  }

  async function submit() {
    // POST to /api/apply-submit (Neon Postgres). Always advance to the
    // HOME RUN screen, even if the backend isn't reachable, so the
    // experience doesn't break for visitors on plain GitHub Pages.
    try {
      await fetch('/api/apply-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state),
      });
    } catch (e) {
      console.warn('[SmallBall] apply submit error:', e);
    }
    show(6);
  }

  // ----- Button wiring -----
  const wire = (id, fn) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', fn);
  };
  wire('btnA', next);
  wire('btnB', prev);
  wire('btnStart', () => { if (idx === 0 || idx === 6) show(1); else next(); });
  wire('btnSelect', () => { if (idx > 0 && idx < 6) show(0); });
  wire('dRight', next);
  wire('dLeft', prev);
  wire('dDown', next);
  wire('dUp', prev);

  // ----- "PRESS START" text on screen is also clickable -----
  document.querySelectorAll('.gb-press-start').forEach(el => {
    el.style.cursor = 'pointer';
    el.addEventListener('click', () => show(1));
  });

  // ----- Tapping anywhere on the title screen advances too -----
  const titleSlide = screen.querySelector('.gb-slide[data-slide="0"]');
  if (titleSlide) {
    titleSlide.style.cursor = 'pointer';
    titleSlide.addEventListener('click', () => { if (idx === 0) show(1); });
  }

  // ----- Keyboard shortcuts -----
  document.addEventListener('keydown', e => {
    // don't hijack Tab/etc
    if (e.target.tagName === 'TEXTAREA' && e.key === 'Enter') return; // allow newlines
    if (['INPUT','SELECT'].includes(e.target.tagName) && e.key === 'Enter') {
      e.preventDefault(); next(); return;
    }
    switch (e.key) {
      case 'ArrowRight':
      case 'a':
      case 'A':
        if (e.target === document.body) { e.preventDefault(); next(); }
        break;
      case 'ArrowLeft':
      case 'b':
      case 'B':
        if (e.target === document.body) { e.preventDefault(); prev(); }
        break;
      case 'Enter':
        if (e.target === document.body) { e.preventDefault(); next(); }
        break;
    }
  });

  show(0);
})();
