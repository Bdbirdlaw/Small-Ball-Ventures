/* ============================================================
   Live ticker — fetches /api/news and replaces the static
   placeholder items inside .espn-rail. Recursively re-fetches on
   an interval so the ticker stays current as new headlines drop.
   Keeps the static fallback if the API is unreachable.
   ============================================================ */

(function () {
  // Same-origin (works when the site is deployed on Vercel).
  // If you ever split the API onto a separate Vercel project, swap
  // this for the full URL, e.g.:
  //   const API_URL = 'https://small-ball-api.vercel.app/api/news';
  const API_URL = '/api/news';

  // How often to re-fetch. Aligned with the Vercel edge cache TTL
  // (s-maxage=300) so most refreshes hit a warm cache and pay
  // basically nothing.
  const REFRESH_MS = 5 * 60 * 1000;       // 5 minutes
  const RETRY_MS   = 30 * 1000;           // 30 seconds on failure

  const ticker = document.querySelector('.espn-ticker');
  if (!ticker) return;

  let lastSignature = '';   // dedupe: skip re-render if items are identical
  let timer = null;

  function renderItem(it) {
    return `
      <div class="espn-item">
        <span class="espn-team">${esc(it.source || '')}</span>
        <span class="espn-meta">${esc(it.headline || '')}</span>
      </div>`;
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  function signature(items) {
    return items.map((it) => (it.source || '') + '|' + (it.headline || '')).join('||');
  }

  // Recursive refresh — schedule the next call from inside the
  // current one, so a slow fetch can't pile up duplicate timers.
  function loadAndSchedule() {
    fetch(API_URL, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.statusText))))
      .then((data) => {
        const items = data && Array.isArray(data.items) ? data.items : [];
        if (!items.length) {
          schedule(REFRESH_MS); // empty result — try again later
          return;
        }

        const sig = signature(items);
        if (sig !== lastSignature) {
          lastSignature = sig;
          const html = items.map(renderItem).join('');
          ticker.querySelectorAll('.espn-group').forEach((g) => {
            g.innerHTML = html;
          });
        }
        schedule(REFRESH_MS);
      })
      .catch(() => {
        // Keep current content (static fallback or last good fetch).
        // Retry sooner than the normal interval.
        schedule(RETRY_MS);
      });
  }

  function schedule(ms) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(loadAndSchedule, ms);
  }

  // Pause refresh when the tab is hidden; resume + immediately
  // refresh when it comes back, so users return to fresh news.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (timer) { clearTimeout(timer); timer = null; }
    } else {
      loadAndSchedule();
    }
  });

  // Kickoff
  loadAndSchedule();
})();
