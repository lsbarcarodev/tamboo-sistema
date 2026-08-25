-- ================================================
-- MIGRAÇÃO: Atualizar status permitidos em st_locacoes
-- Execute este script no SQL Editor do seu Supabase
-- ================================================

-- 1. Remover o constraint antigo de status
ALTER TABLE st_locacoes DROP CONSTRAINT IF EXISTS st_locacoes_status_check;

-- 2. Adicionar o novo constraint com todos os status
ALTER TABLE st_locacoes 
  ADD CONSTRAINT st_locacoes_status_check 
  CHECK (status IN ('Pendente', 'Alocado', 'Aguardando Troca', 'Atrasado', 'Concluído'));

-- 3. Migrar registros antigos: 'Em Rota' → 'Alocado'
UPDATE st_locacoes SET status = 'Alocado' WHERE status = 'Em Rota';

-- 4. Adicionar colunas de equipamento individual (caso ainda não existam)
ALTER TABLE st_locacoes 
  ADD COLUMN IF NOT EXISTS equipamento_id UUID REFERENCES st_equipamentos(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS equipamento_codigo TEXT;

-- 5. Notificar a API para atualizar o cache
NOTIFY pgrst, 'reload schema';
