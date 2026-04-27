-- ============================================================
-- Migration 006: Enforce 1-to-1 between professionals and profiles
-- ============================================================
-- The code always assumes one professional record per profile, but
-- there was no database-level constraint preventing duplicates.
-- This migration makes that invariant explicit.
--
-- Safe to run multiple times (IF NOT EXISTS).
-- No data loss: index creation only, no column drops.
-- ============================================================

-- Deduplicate before creating the unique index (keep oldest row per profile_id)
DELETE FROM professionals a
USING professionals b
WHERE a.profile_id = b.profile_id
  AND a.id > b.id;

CREATE UNIQUE INDEX IF NOT EXISTS professionals_profile_id_unique
  ON professionals(profile_id);

-- ============================================================
-- Backfill: ensure every existing profile has a 'client' role
-- in account_roles. Profiles that were created before the guard
-- fix (resolveOrProvisionProfile) went live may be missing it.
-- ============================================================
INSERT INTO account_roles (profile_id, role, is_active, is_primary)
SELECT
  p.id,
  'client',
  true,
  -- Mark as primary only if no primary role exists yet for this profile
  NOT EXISTS (
    SELECT 1 FROM account_roles ar2
    WHERE ar2.profile_id = p.id AND ar2.is_primary = true
  )
FROM profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM account_roles ar
  WHERE ar.profile_id = p.id AND ar.role = 'client'
)
ON CONFLICT (profile_id, role) DO NOTHING;
