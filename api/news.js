// CommonJS for max Vercel runtime compatibility
const Parser = require('rss-parser');

const parser = new Parser({ timeout: 8000 });

const SOURCES = [
  { name: 'TechCrunch',   acronym: 'TC', tile: '#0AA34F', url: 'https://techcrunch.com/feed/' },
  { name: 'The Verge',    acronym: 'VG', tile: '#5200CC', url: 'https://www.theverge.com/rss/index.xml' },
  { name: 'Ars Technica', acronym: 'AT', tile: '#FF4F00', url: 'https://feeds.arstechnica.com/arstechnica/technology-lab' },
  { name: 'Wired',        acronym: 'WR', tile: '#000000', url: 'https://www.wired.com/feed/rss' },
  { name: 'VentureBeat',  acronym: 'VB', tile: '#DC1A28', url: 'https://venturebeat.com/feed/' },
  { name: 'Engadget',     acronym: 'EG', tile: '#0E8C3D', url: 'https://www.engadget.com/rss.xml' },
];

const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;
const MAX_ITEMS = 12;

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
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
      .filter((i) => i.headline && i.published)
      .filter((i) => !isPromo(i));

    const cutoff = Date.now() - FOUR_HOURS_MS;
    const recent = all
      .map((i) => Object.assign({}, i, { _t: new Date(i.published).getTime() }))
      .filter((i) => i._t > cutoff)
      .sort((a, b) => b._t - a._t);

    const balanced = roundRobin(recent).slice(0, MAX_ITEMS);

    res.status(200).json({
      updated: new Date().toISOString(),
      window_hours: 4,
      count: balanced.length,
      items: balanced.map(({ _t, ...rest }) => rest),
    });
  } catch (err) {
    res.status(500).json({ error: (err && err.message) || 'fetch failed' });
  }
};

function cleanTitle(t) {
  return t.replace(/\s+/g, ' ').replace(/\s*\|.*$/, '').trim();
}

// Filter out deal / promo / affiliate / sponsored content. RSS feeds
// from TC / Verge / Wired / Engadget all mix these into the main feed.
const PROMO_TITLE_RE = new RegExp(
  '\\b(' + [
    'deal', 'deals',
    'sale', 'on sale',
    'discount(?:ed)?',
    'coupon', 'promo code', 'promotional code', 'promo',
    'save \\$?\\d', 'save up to',
    '\\d{1,3}%\\s*(?:off|discount)', '\\$\\d+\\s*off',
    'best (?:buys?|gifts?|laptops?|monitors?|tvs?|deals?)',
    'cyber monday', 'black friday', 'prime day', 'holiday deals?',
    'gift guide', 'gift ideas?',
    'affiliate', 'sponsored', 'partner content', 'paid post',
    'shop now', 'buy now', 'shop the',
    'amazon deal', 'walmart deal'
  ].join('|') + ')\\b',
  'i'
);

const PROMO_URL_RE =
  /\/(deals?|sponsored|partner-content|partner|shop|coupons?|sale|promotion[s]?|advertorial|affiliate)(\/|$)/i;

function isPromo(item) {
  const title = (item.headline || '').toLowerCase();
  const url   = (item.link || '').toLowerCase();
  if (PROMO_TITLE_RE.test(title)) return true;
  if (PROMO_URL_RE.test(url))     return true;
  return false;
}

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
