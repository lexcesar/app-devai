-- Add 'cancelled' value to work_status enum
-- This allows works to reflect the cancellation of their linked visit
ALTER TYPE work_status ADD VALUE IF NOT EXISTS 'cancelled';
