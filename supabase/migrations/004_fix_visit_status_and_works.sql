-- ============================================================
-- Migration 004: Adicionar valores ao enum visit_status
--
-- NOTA: ALTER TYPE ADD VALUE não pode ser USADO na mesma transação
-- em que é executado (limitação do PostgreSQL). Por isso esta migration
-- apenas adiciona os valores; o restante das alterações (DEFAULT, índices,
-- colunas) está em 005_fix_visit_defaults_and_works.sql que roda em uma
-- transação separada, após este commit.
-- ============================================================

ALTER TYPE visit_status ADD VALUE IF NOT EXISTS 'pending'  BEFORE 'confirmed';
ALTER TYPE visit_status ADD VALUE IF NOT EXISTS 'rejected' AFTER  'cancelled';
