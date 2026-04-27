-- Migration 07: Add metadata JSONB column to notifications
-- Allows attaching structured data (visitId, specialty, scheduledAt, etc.)
-- to notifications without altering existing columns.
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS metadata JSONB;
