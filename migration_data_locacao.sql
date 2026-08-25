-- ================================================
-- MIGRAÇÃO: Substituir "codigo" por "data_locacao" + "data_retirada"
-- ================================================

-- 1. Adicionar a coluna data_locacao (data prevista de ENTREGA ao cliente)
ALTER TABLE st_locacoes 
  ADD COLUMN IF NOT EXISTS data_locacao DATE DEFAULT CURRENT_DATE;

-- Atualizar registros existentes (apenas precaução)
UPDATE st_locacoes SET data_locacao = CURRENT_DATE WHERE data_locacao IS NULL;

-- Tornar NOT NULL
ALTER TABLE st_locacoes ALTER COLUMN data_locacao SET NOT NULL;

-- 2. Adicionar a coluna data_retirada (data prevista de RETIRADA do cliente) — OPCIONAL
ALTER TABLE st_locacoes 
  ADD COLUMN IF NOT EXISTS data_retirada DATE;

-- 3. Remover a constraint UNIQUE e a coluna codigo
ALTER TABLE st_locacoes DROP CONSTRAINT IF EXISTS st_locacoes_codigo_key;
ALTER TABLE st_locacoes DROP COLUMN IF EXISTS codigo;

-- 4. Atualizar cache do PostgREST
NOTIFY pgrst, 'reload schema';
