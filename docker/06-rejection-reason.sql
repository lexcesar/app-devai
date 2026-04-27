-- Migration 06: rejection_reason já está incluído no 01-schema.sql como parte da definição original.
-- Este arquivo é mantido por compatibilidade com ambientes que já aplicaram o schema sem a coluna.
ALTER TABLE visits ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
