-- ============================================================
-- Migration 08: Structured address fields + visit metadata
--
-- Adds structured address columns to the visits table so that
-- clients can provide a proper, validated address when booking.
-- The existing `address` TEXT column is kept for backward
-- compatibility and display purposes.
--
-- Also adds:
--   requester_name  — pre-filled from the authenticated user
--   service_type    — specialty/service being requested
--   description     — detailed problem description
-- ============================================================

-- 1. Structured address columns ─────────────────────────────

ALTER TABLE visits
  ADD COLUMN IF NOT EXISTS street          TEXT,
  ADD COLUMN IF NOT EXISTS street_number   TEXT,
  ADD COLUMN IF NOT EXISTS complement      TEXT,
  ADD COLUMN IF NOT EXISTS neighborhood    TEXT,
  ADD COLUMN IF NOT EXISTS city_name       TEXT,
  ADD COLUMN IF NOT EXISTS state_code      TEXT;

-- 2. Booking metadata columns ────────────────────────────────

ALTER TABLE visits
  ADD COLUMN IF NOT EXISTS requester_name  TEXT,
  ADD COLUMN IF NOT EXISTS service_type    TEXT,
  ADD COLUMN IF NOT EXISTS description     TEXT;

-- 3. Indexes ─────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_visits_city_name
  ON visits (city_name)
  WHERE city_name IS NOT NULL;
