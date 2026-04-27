-- ============================================================
-- Migration 06: Notifications
--
-- Stores in-app notifications triggered by visit/work status
-- changes. Each row targets one profile_id (the recipient).
-- ============================================================

CREATE TABLE IF NOT EXISTS notifications (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id  UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type        TEXT        NOT NULL,
  title       TEXT        NOT NULL,
  message     TEXT        NOT NULL,
  link        TEXT,
  is_read     BOOLEAN     NOT NULL DEFAULT false,
  metadata    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_profile_unread
  ON notifications (profile_id, is_read, created_at DESC);
