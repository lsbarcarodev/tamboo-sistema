-- ================================================
-- MIGRAÇÃO: Remover coluna "quantidade" de st_locacoes
-- ================================================

-- 1. Remove a coluna quantidade, pois agora usamos equipamento_id (1 para 1)
ALTER TABLE st_locacoes 
  DROP COLUMN IF EXISTS quantidade;

-- 2. Atualiza o cache do schema no PostgREST (Supabase)
NOTIFY pgrst, 'reload schema';
