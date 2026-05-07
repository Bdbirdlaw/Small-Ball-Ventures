# Neon Postgres setup

The site has two forms that write to a Neon Postgres database:

- **Invest page** (`invest.html`) → `lp_submissions` table
- **Apply page** (`apply.html`) → `founder_applications` table

Until you connect Neon, both forms still display the success UI to visitors,
but their submissions are only logged to the Vercel function log (not stored).
The schema is ready to run, the API routes are in place, and the form handlers
already POST to them. You just need to provision the DB.

## One-time setup (~10 minutes)

### 1. Create a Neon project

1. Go to https://neon.tech and sign up (use GitHub).
2. Create a new project. Region: **US East 2 (Ohio)** or whatever's closest to your Vercel region.
3. Free tier is plenty for forms.

### 2. Run the schema

In the Neon console, open the **SQL Editor** and paste the entire contents
of `db/schema.sql` from this repo. Click Run. Two tables and four indexes
are created.

### 3. Connect Neon to Vercel

Easiest way (auto env vars):

1. In your Vercel project, go to **Storage → Connect Database → Neon**.
2. Authorize. Pick the project you just created.
3. Vercel automatically injects `DATABASE_URL` into Production, Preview, and Development env scopes.
4. Vercel triggers a redeploy.

After the redeploy, the API routes will start writing to Postgres.

### 4. Verify

Submit the Invest form at `https://YOUR-VERCEL-URL/invest.html`. Then in
Neon's SQL Editor:

```sql
SELECT id, created_at, name, email, commitment, interests
FROM lp_submissions
ORDER BY created_at DESC
LIMIT 10;
```

You should see your submission.

Same check for founders:

```sql
SELECT id, created_at, name, email, position, company, pitch
FROM founder_applications
ORDER BY created_at DESC
LIMIT 10;
```

## Reading submissions later

A few options to view rows day-to-day:

- **Neon SQL Editor** — just query directly, free and fine for low volume.
- **Drizzle Studio / Prisma Studio** — better UI, point at `DATABASE_URL`.
- **A simple admin page** in this repo — happy to scaffold a password-protected
  `/admin` route that lists submissions when you want it.

## Schema notes

- `interests` is a text array (LP form has 4 checkbox interests).
- Both tables capture `ip` and `user_agent` for sanity / abuse prevention.
- `consent` on LP submissions is the explicit checkbox confirming the
  submission is an indication, not a binding commitment.

## Local dev

If you want to run forms locally:

```bash
npm install
echo "DATABASE_URL=postgresql://…" > .env.local
npx vercel dev
```

`vercel dev` proxies API routes to local handlers so you can test end-to-end.

## Files involved

```
api/
  lp-submit.js        ← /api/lp-submit  (LP indication of interest)
  apply-submit.js     ← /api/apply-submit  (founder applications)
  news.js             ← /api/news  (RSS aggregator, unrelated)

db/
  schema.sql          ← run once in Neon

invest.html           ← submits via fetch('/api/lp-submit')
scripts/apply.js      ← submits via fetch('/api/apply-submit')

package.json          ← @neondatabase/serverless dependency
```
