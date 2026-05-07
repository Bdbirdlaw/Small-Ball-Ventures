// LP indication-of-interest submission handler
// POST /api/lp-submit  — writes a row to Neon Postgres lp_submissions

const { neon } = require('@neondatabase/serverless');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Soft-fail with a clear message if the DB env var hasn't been wired yet
  if (!process.env.DATABASE_URL) {
    console.warn('[lp-submit] DATABASE_URL not set');
    return res.status(503).json({ error: 'Database not configured' });
  }

  try {
    const body = req.body || {};

    if (!body.name || !body.email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    // Normalize interest checkboxes (single string -> array)
    let interests = body.interest;
    if (typeof interests === 'string') interests = [interests];
    if (!Array.isArray(interests)) interests = [];

    const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim()
      || (req.socket && req.socket.remoteAddress) || '';
    const userAgent = req.headers['user-agent'] || '';

    const sql = neon(process.env.DATABASE_URL);

    await sql`
      INSERT INTO lp_submissions
        (name, email, phone, city, firm, title,
         investor_type, accreditation, commitment, timeline, referral, interests,
         notes, consent, ip, user_agent)
      VALUES
        (${body.name}, ${body.email}, ${body.phone || null}, ${body.city || null},
         ${body.firm || null}, ${body.title || null},
         ${body.type || null}, ${body.accred || null}, ${body.commit || null},
         ${body.timeline || null}, ${body.referral || null}, ${interests},
         ${body.notes || null}, ${!!body.consent}, ${ip}, ${userAgent})
    `;

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[lp-submit] error:', err);
    return res.status(500).json({ error: err.message || 'submit failed' });
  }
};
