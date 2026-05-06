/* ============================================================
   Shared site JS — nav, portfolio filters, scroll polish
   ============================================================ */

(function () {
  // ----- Mobile nav toggle -----
  const nav = document.getElementById('nav');
  const burger = document.getElementById('navBurger');
  if (burger && nav) {
    burger.addEventListener('click', () => nav.classList.toggle('open'));
    nav.querySelectorAll('.nav-links a').forEach(a => {
      a.addEventListener('click', () => nav.classList.remove('open'));
    });
  }

  // ----- Portfolio filters -----
  const filters = document.getElementById('filters');
  const roster = document.getElementById('roster');
  if (filters && roster) {
    const cards = Array.from(roster.querySelectorAll('.bb-card'));
    filters.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-filter]');
      if (!btn) return;
      filters.querySelectorAll('button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const f = btn.dataset.filter;
      cards.forEach(c => {
        const cats = (c.dataset.cat || '').split(/\s+/);
        const show = f === 'all' || cats.includes(f);
        c.style.display = show ? '' : 'none';
      });
    });
  }

  // ----- Team roster expand/collapse (About page) -----
  const teamBtn = document.getElementById('teamExpandBtn');
  const teamExtra = document.getElementById('teamGridExtended');
  if (teamBtn && teamExtra) {
    teamBtn.addEventListener('click', () => {
      const open = teamExtra.classList.toggle('is-open');
      const label = teamBtn.querySelector('.team-expand-label');
      if (open) {
        teamExtra.hidden = false;
        teamBtn.setAttribute('aria-expanded', 'true');
        if (label) label.textContent = 'Hide Full Roster ▲';
      } else {
        teamBtn.setAttribute('aria-expanded', 'false');
        if (label) label.textContent = 'View Full Roster ▼';
        // Wait for collapse transition before re-hiding from layout
        setTimeout(() => { if (!teamExtra.classList.contains('is-open')) teamExtra.hidden = true; }, 500);
      }
    });
  }

  // ----- Subtle reveal on scroll -----
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(en => {
        if (en.isIntersecting) {
          en.target.style.transition = 'opacity .6s ease, transform .6s ease';
          en.target.style.opacity = '1';
          en.target.style.transform = 'translateY(0)';
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.08 });
    document.querySelectorAll('.card, .bb-card, .player, .stat, .vs-col, .scoreboard, .callout, .hero-card')
      .forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(14px)';
        io.observe(el);
      });
  }
})();
