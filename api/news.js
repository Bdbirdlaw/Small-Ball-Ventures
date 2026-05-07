// CommonJS for max Vercel runtime compatibility
const Parser = require('rss-parser');

// Anthropic SDK is optional — if the package fails to install or load,
// the news API still works (just falls back to round-robin ordering
// instead of Claude re-ranking).
let Anthropic = null;
try {
  const sdk = require('@anthropic-ai/sdk');
  Anthropic = sdk.default || sdk.Anthropic || sdk;
} catch (err) {
  console.warn('[news] @anthropic-ai/sdk not loaded:', err && err.message);
}

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
const CANDIDATE_POOL = 30; // headlines we hand to Claude for re-ranking

// ============================================================
// Claude re-ranker — sends candidates to Opus 4.7 for editorial
// scoring. Cached system prompt (~$0.003/call after first hit).
// Falls back gracefully if ANTHROPIC_API_KEY isn't set or the
// call fails for any reason.
// ============================================================

const anthropic = (Anthropic && process.env.ANTHROPIC_API_KEY)
  ? safeNewAnthropic()
  : null;

function safeNewAnthropic() {
  try {
    return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: 8000 });
  } catch (err) {
    console.warn('[news] Anthropic constructor failed:', err && err.message);
    return null;
  }
}

const RERANK_SYSTEM = `You curate a tech-news ticker for an audience of venture capitalists, founders, and limited partners.

From the numbered list of headlines, return ONLY the indices of the items that are genuinely relevant for this audience.

KEEP:
- Venture capital, M&A, IPOs, fundraises, secondary tenders
- Big tech earnings, strategy, antitrust, regulation
- AI, fintech, climate tech, defense tech, biotech with real business implications
- Major hires, leadership changes, board moves
- Macro market signals (rate moves, sector rotations) only when tech-related

DROP:
- Consumer product reviews (gadgets, watches, gaming hardware, headphones)
- Lifestyle, entertainment, sports, culture
- Promotional / deal / sponsored / "best of" roundups
- Generic gadget launches without business angle
- How-to / explainer content
- Coverage of vlogs, social-media drama, influencer news

Return ONLY a comma-separated list of the kept indices, ranked best-first. Maximum 12. No prose, no preamble, no trailing punctuation. Example: 3,1,7,12,4,8,2,15,9`;

async function rerankWithClaude(items) {
  if (!anthropic || items.length === 0) return null;

  const candidates = items.slice(0, CANDIDATE_POOL);
  const numbered = candidates
    .map((it, i) => `${i + 1}. [${it.source}] ${it.headline}`)
    .join('\n');

  try {
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 200,
      output_config: { effort: 'low' },
      system: [
        { type: 'text', text: RERANK_SYSTEM, cache_control: { type: 'ephemeral' } },
      ],
      messages: [{ role: 'user', content: numbered }],
    });

    let text = '';
    for (const block of response.content) {
      if (block && block.type === 'text') text += block.text;
    }

    const seen = new Set();
    const indices = text
      .split(/[,\s]+/)
      .map((s) => parseInt(s, 10) - 1)
      .filter((i) => Number.isInteger(i) && i >= 0 && i < candidates.length)
      .filter((i) => {
        if (seen.has(i)) return false;
        seen.add(i);
        return true;
      });

    if (indices.length === 0) return null;
    return indices.map((i) => candidates[i]);
  } catch (err) {
    console.warn('[news] Claude rerank failed:', (err && err.message) || err);
    return null;
  }
}

// ============================================================
// Handler
// ============================================================

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

    // Cap candidate pool, then ask Claude to rerank.
    // If Claude is unavailable or fails, fall back to round-robin
    // across sources so the ticker still has variety.
    const candidates = recent.slice(0, CANDIDATE_POOL);
    const reranked = await rerankWithClaude(candidates);
    const ordered = reranked || roundRobin(candidates);
    const balanced = ordered.slice(0, MAX_ITEMS);

    res.status(200).json({
      updated: new Date().toISOString(),
      window_hours: 4,
      reranked: !!reranked,
      count: balanced.length,
      items: balanced.map(({ _t, ...rest }) => rest),
    });
  } catch (err) {
    res.status(500).json({ error: (err && err.message) || 'fetch failed' });
  }
};

// ============================================================
// Helpers
// ============================================================

function cleanTitle(t) {
  return t.replace(/\s+/g, ' ').replace(/\s*\|.*$/, '').trim();
}

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
    'amazon deal', 'walmart deal',
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
