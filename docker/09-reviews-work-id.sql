-- Migration: add work_id to reviews and change unique constraint
-- Allows a client to review the same professional across different works

ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS work_id UUID REFERENCES works(id) ON DELETE CASCADE;

-- Drop old constraint (one review per professional per reviewer ever)
ALTER TABLE reviews
  DROP CONSTRAINT IF EXISTS reviews_professional_id_reviewer_id_key;

-- New constraint: one review per work per reviewer
ALTER TABLE reviews
  ADD CONSTRAINT reviews_work_id_reviewer_id_key UNIQUE (work_id, reviewer_id);

-- Index for fast lookup by work
CREATE INDEX IF NOT EXISTS idx_reviews_work_id ON reviews(work_id);
