-- Small Ball Ventures · Neon Postgres schema
-- Run this once in the Neon SQL Editor after creating your project.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- LP indication-of-interest submissions (from /invest.html)
-- ============================================================
CREATE TABLE IF NOT EXISTS lp_submissions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  name            TEXT NOT NULL,
  email           TEXT NOT NULL,
  phone           TEXT,
  city            TEXT,
  firm            TEXT,
  title           TEXT,

  investor_type   TEXT,
  accreditation   TEXT,
  commitment      TEXT,
  timeline        TEXT,
  referral        TEXT,
  interests       TEXT[],

  notes           TEXT,
  consent         BOOLEAN,

  ip              TEXT,
  user_agent      TEXT
);
CREATE INDEX IF NOT EXISTS idx_lp_created_at ON lp_submissions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lp_email      ON lp_submissions (email);


-- ============================================================
-- Founder application submissions (from /apply.html — Gameboy form)
-- ============================================================
CREATE TABLE IF NOT EXISTS founder_applications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  name            TEXT NOT NULL,
  email           TEXT NOT NULL,
  city            TEXT,

  position        TEXT,
  years           TEXT,

  big_win         TEXT,
  loss            TEXT,

  company         TEXT,
  pitch           TEXT,
  jv_partner      TEXT,

  extra           TEXT,

  ip              TEXT,
  user_agent      TEXT
);
CREATE INDEX IF NOT EXISTS idx_app_created_at ON founder_applications (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_email      ON founder_applications (email);
