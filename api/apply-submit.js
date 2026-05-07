// Founder application submission handler
// POST /api/apply-submit  — writes a row to Neon Postgres founder_applications

const { neon } = require('@neondatabase/serverless');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.DATABASE_URL) {
    console.warn('[apply-submit] DATABASE_URL not set');
    return res.status(503).json({ error: 'Database not configured' });
  }

  try {
    const body = req.body || {};

    if (!body.name || !body.email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim()
      || (req.socket && req.socket.remoteAddress) || '';
    const userAgent = req.headers['user-agent'] || '';

    const sql = neon(process.env.DATABASE_URL);

    await sql`
      INSERT INTO founder_applications
        (name, email, city, position, years,
         big_win, loss, company, pitch, jv_partner, extra,
         ip, user_agent)
      VALUES
        (${body.name}, ${body.email}, ${body.city || null},
         ${body.position || null}, ${body.years || null},
         ${body.bigwin || null}, ${body.loss || null},
         ${body.co || null}, ${body.pitch || null},
         ${body.jv || null}, ${body.extra || null},
         ${ip}, ${userAgent})
    `;

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[apply-submit] error:', err);
    return res.status(500).json({ error: err.message || 'submit failed' });
  }
};
