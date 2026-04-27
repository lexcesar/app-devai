-- ============================================================
-- Fase 7: Enforce 1-to-1 professionals ↔ profiles + backfill
-- ============================================================
-- Mirror of supabase/migrations/006_professionals_unique_profile.sql
-- for local Docker environment.
-- ============================================================

DELETE FROM professionals a
USING professionals b
WHERE a.profile_id = b.profile_id
  AND a.id > b.id;

CREATE UNIQUE INDEX IF NOT EXISTS professionals_profile_id_unique
  ON professionals(profile_id);

INSERT INTO account_roles (profile_id, role, is_active, is_primary)
SELECT
  p.id,
  'client',
  true,
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
