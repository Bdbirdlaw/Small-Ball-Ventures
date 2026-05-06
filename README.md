# Small Ball Ventures

The marketing site for **Small Ball Ventures** — a Nashville venture studio
practicing the Moneyball strategy: pair scrappy founders with field experts,
target ~$25M strategic exits, compound to a ~9.0x fund return.

## Stack

Pure static HTML, CSS, and vanilla JS. No build step, no framework.
Deploys to anything that serves files (Vercel, Netlify, GitHub Pages, S3+CF).

## Pages

| Page | File | Notes |
| --- | --- | --- |
| Home | `index.html` | Thesis, JV edge, comparison vs. traditional VC, six-step playbook |
| About | `about.html` | Origin story, why Nashville, six clubhouse rules, team |
| Portfolio | `portfolio.html` | Twelve baseball-card style portfolio companies w/ filters |
| Apply | `apply.html` | Gameboy-themed multi-step application |

## Design system

- **Palette:** Oakland A's vintage — kelly green `#003831`, athletics gold `#EFB21E`, vintage cream `#F5E6C8`.
- **Type:** `DM Serif Display` (display), `Inter` (body), `Press Start 2P` (pixel/UI), `VT323` (mono/scoreboard).
- **Aesthetic:** retro scoreboard + chunky drop-shadows + pixel headings, on a high-tech VC base layer.

## Logo

Drop the official PNG at `assets/logo.png` (the site references that path
across all pages and the footer). A placeholder `assets/logo.svg` is included
so the site renders cleanly until the PNG is added. The `<img>` tags fall back
gracefully if the file is missing.

## Local dev

Just open `index.html` in a browser, or:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Apply page controls

The Apply page is themed as a Gameboy baseball video game. Controls:

- **Click** the on-screen D-pad / A / B / START / SELECT buttons, or
- **Keyboard:** `←` / `→` to navigate, `A` = next, `B` = back, `Enter` = swing.

Submissions currently log to `console.log`. Wire up your form backend of
choice (Formspree, a serverless function, etc.) inside `scripts/apply.js`'s
`submit()` function.
