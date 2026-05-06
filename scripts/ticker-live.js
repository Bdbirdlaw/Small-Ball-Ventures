/* ============================================================
   Live ticker — fetches /api/news and replaces the static
   placeholder items inside .espn-rail. Keeps the static fallback
   if the API is unreachable (so the page still works on plain
   GitHub Pages without Vercel deployed).
   ============================================================ */

(function () {
  // Same-origin (works when the site is deployed on Vercel).
  // If you ever split the API onto a separate Vercel project, swap
  // this for the full URL, e.g.:
  //   const API_URL = 'https://small-ball-api.vercel.app/api/news';
  const API_URL = '/api/news';

  const ticker = document.querySelector('.espn-ticker');
  if (!ticker) return;

  fetch(API_URL, { cache: 'no-store' })
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.statusText))))
    .then((data) => {
      const items = data && Array.isArray(data.items) ? data.items : [];
      if (!items.length) return; // keep the static fallback

      const html = items.map(renderItem).join('');
      ticker.querySelectorAll('.espn-group').forEach((g) => {
        g.innerHTML = html;
      });
    })
    .catch(() => {
      /* keep static fallback — no-op */
    });

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
})();
