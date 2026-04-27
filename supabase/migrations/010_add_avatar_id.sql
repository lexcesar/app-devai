-- Migration 010: add avatar_id to profiles
-- Stores the identifier of the selected preset avatar (e.g. "professional-electrician-01").
-- The frontend resolves this id to the actual image path via PRESET_AVATARS.
-- avatar_url is kept as a legacy fallback (populated by Clerk during provisioning).

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_id TEXT DEFAULT NULL;
