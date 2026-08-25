-- ================================================
-- MIGRAÇÃO: Adicionar colunas de rastreamento em st_locacoes
-- Campos: updated_by (quem fez a última atualização) e comprovante_at (data/hora da foto)
-- Execute este script no SQL Editor do seu Supabase
-- ================================================

-- 1. Adicionar coluna "updated_by" para rastrear quem fez a última atualização
-- Valores possíveis: 'Motorista', ou nome do administrador logado
ALTER TABLE st_locacoes 
  ADD COLUMN IF NOT EXISTS updated_by TEXT;

-- 2. Adicionar coluna "comprovante_at" para rastrear quando a foto foi tirada/enviada
ALTER TABLE st_locacoes 
  ADD COLUMN IF NOT EXISTS comprovante_at TIMESTAMP WITH TIME ZONE;

-- 3. Preencher registros existentes com valores padrão
UPDATE st_locacoes SET updated_by = 'Administrador' WHERE updated_by IS NULL;

-- 4. Atualizar cache do PostgREST
NOTIFY pgrst, 'reload schema';
