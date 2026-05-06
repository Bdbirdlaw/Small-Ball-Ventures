import Parser from 'rss-parser';

const parser = new Parser({ timeout: 8000 });

// Free, public RSS feeds. Add/remove as you see fit. Avoid gated sources
// like The Information / Bloomberg / WSJ — they don't expose full RSS.
const SOURCES = [
  { name: 'TechCrunch',    acronym: 'TC', tile: '#0AA34F', url: 'https://techcrunch.com/feed/' },
  { name: 'The Verge',     acronym: 'VG', tile: '#5200CC', url: 'https://www.theverge.com/rss/index.xml' },
  { name: 'Ars Technica',  acronym: 'AT', tile: '#FF4F00', url: 'https://feeds.arstechnica.com/arstechnica/technology-lab' },
  { name: 'Wired',         acronym: 'WR', tile: '#000000', url: 'https://www.wired.com/feed/rss' },
  { name: 'VentureBeat',   acronym: 'VB', tile: '#DC1A28', url: 'https://venturebeat.com/feed/' },
  { name: 'Engadget',      acronym: 'EG', tile: '#0E8C3D', url: 'https://www.engadget.com/rss.xml' },
];

const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;
const MAX_ITEMS = 12;

export default async function handler(req, res) {
  // Allow the static GitHub Pages site (or anywhere) to call us
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  // Cache at the edge for 5 min, serve stale up to 30 min while revalidating
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=1800');

  try {
    const settled = await Promise.allSettled(
      SOURCES.map(async (s) => {
        const feed = await parser.parseURL(s.url);
        return (feed.items || []).slice(0, 6).map((it) => ({
          source: s.name,
          acronym: s.acronym,
          tile: s.tile,
          headline: cleanTitle(it.title || ''),
          link: it.link || '',
          published: it.isoDate || it.pubDate || null,
        }));
      })
    );

    const all = settled
      .filter((r) => r.status === 'fulfilled')
      .flatMap((r) => r.value)
      .filter((i) => i.headline && i.published);

    // Sort newest first, drop anything older than 4 hours
    const cutoff = Date.now() - FOUR_HOURS_MS;
    const recent = all
      .map((i) => ({ ...i, _t: new Date(i.published).getTime() }))
      .filter((i) => i._t > cutoff)
      .sort((a, b) => b._t - a._t);

    // Round-robin across sources so the ticker isn't dominated by one outlet
    const balanced = roundRobin(recent).slice(0, MAX_ITEMS);

    res.status(200).json({
      updated: new Date().toISOString(),
      window_hours: 4,
      count: balanced.length,
      items: balanced.map(({ _t, ...rest }) => rest),
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'fetch failed' });
  }
}

function cleanTitle(t) {
  return t.replace(/\s+/g, ' ').replace(/\s*\|.*$/, '').trim();
}

// Interleave items by source so the ticker doesn't show 6 TechCrunch
// articles in a row.
function roundRobin(items) {
  const buckets = new Map();
  for (const it of items) {
    if (!buckets.has(it.acronym)) buckets.set(it.acronym, []);
    buckets.get(it.acronym).push(it);
  }
  const out = [];
  let added = true;
  while (added) {
    added = false;
    for (const arr of buckets.values()) {
      if (arr.length) { out.push(arr.shift()); added = true; }
    }
  }
  return out;
}
