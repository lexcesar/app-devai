-- ============================================================
-- Migration 005: Defaults, colunas e índices que dependem dos
--                novos valores do enum visit_status (004)
--
-- Esta migration roda em transação separada de 004, garantindo
-- que 'pending' e 'rejected' já estejam visíveis ao PostgreSQL.
-- ============================================================

-- 1. Alterar default da coluna status para 'pending'
ALTER TABLE visits
  ALTER COLUMN status SET DEFAULT 'pending';

-- 2. Adicionar coluna rejection_reason se ainda não existir
ALTER TABLE visits
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- 3. Corrigir índice de double-booking para excluir também rejected
DROP INDEX IF EXISTS idx_visits_no_double_booking;
CREATE UNIQUE INDEX idx_visits_no_double_booking
  ON visits (professional_id, scheduled_at)
  WHERE status NOT IN ('cancelled', 'rejected');

-- 4. Adicionar visit_id em works (vínculo opcional com a visita de origem)
ALTER TABLE works
  ADD COLUMN IF NOT EXISTS visit_id UUID REFERENCES visits(id) ON DELETE SET NULL;

-- 5. Índice único parcial: cada visita gera no máximo uma obra
CREATE UNIQUE INDEX IF NOT EXISTS works_visit_id_unique
  ON works (visit_id)
  WHERE visit_id IS NOT NULL;

-- 6. Índice auxiliar de lookup por visit_id
CREATE INDEX IF NOT EXISTS idx_works_visit_id
  ON works (visit_id);
