-- ============================================================
-- Migration 008: Structured address fields + visit metadata
-- ============================================================

ALTER TABLE visits
  ADD COLUMN IF NOT EXISTS street          TEXT,
  ADD COLUMN IF NOT EXISTS street_number   TEXT,
  ADD COLUMN IF NOT EXISTS complement      TEXT,
  ADD COLUMN IF NOT EXISTS neighborhood    TEXT,
  ADD COLUMN IF NOT EXISTS city_name       TEXT,
  ADD COLUMN IF NOT EXISTS state_code      TEXT,
  ADD COLUMN IF NOT EXISTS requester_name  TEXT,
  ADD COLUMN IF NOT EXISTS service_type    TEXT,
  ADD COLUMN IF NOT EXISTS description     TEXT;

CREATE INDEX IF NOT EXISTS idx_visits_city_name
  ON visits (city_name)
  WHERE city_name IS NOT NULL;
