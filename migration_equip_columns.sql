-- ================================================
-- MIGRAÇÃO: Adicionar colunas de equipamento individual em st_locacoes
-- Execute este script no SQL Editor do seu Supabase
-- ================================================

ALTER TABLE st_locacoes 
  ADD COLUMN IF NOT EXISTS equipamento_id UUID REFERENCES st_equipamentos(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS equipamento_codigo TEXT;

-- Atualizar cache do schema da API
NOTIFY pgrst, 'reload schema';
