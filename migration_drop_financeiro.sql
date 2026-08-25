-- ================================================
-- MIGRAÇÃO: Remoção do Módulo Financeiro
-- Execute este script no SQL Editor do seu Supabase
-- ================================================

-- 1. Remover a coluna de ligação na tabela de locações
ALTER TABLE st_locacoes DROP COLUMN IF EXISTS financeiro_lancamento_id;

-- 2. Remover a tabela de lançamentos financeiros
DROP TABLE IF EXISTS st_financeiro_lancamentos;

-- 3. Remover a tabela de contas
DROP TABLE IF EXISTS st_financeiro_contas;

-- 4. Remover a tabela de categorias
DROP TABLE IF EXISTS st_financeiro_categorias;

-- 5. Atualizar o cache da API do Supabase
NOTIFY pgrst, 'reload schema';
