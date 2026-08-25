-- ================================================
-- MIGRAÇÃO CONSOLIDADA: ALINHAMENTO DO SUPABASE COM O FRONTEND
-- Execute este script inteiro no SQL Editor do seu Supabase
-- para garantir que o banco entenda todas as mudanças feitas.
-- ================================================

BEGIN;

-- 1. DELEÇÃO DO MÓDULO FINANCEIRO
---------------------------------------------------
-- Primeiro removemos a coluna que depende da tabela financeira
ALTER TABLE st_locacoes DROP COLUMN IF EXISTS financeiro_lancamento_id;

-- Depois dropamos as tabelas financeiras
DROP TABLE IF EXISTS st_financeiro_lancamentos CASCADE;
DROP TABLE IF EXISTS st_financeiro_contas CASCADE;
DROP TABLE IF EXISTS st_financeiro_categorias CASCADE;

-- 2. GARANTIR COLUNAS DE EQUIPAMENTOS EM LOCAÇÕES
---------------------------------------------------
ALTER TABLE st_locacoes 
  ADD COLUMN IF NOT EXISTS equipamento_id UUID REFERENCES st_equipamentos(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS equipamento_codigo TEXT;

-- 3. AJUSTE DAS RESTRIÇÕES DE STATUS (st_locacoes)
---------------------------------------------------
-- Remover a restrição antiga, não importando o nome que ela tenha atualmente
ALTER TABLE st_locacoes DROP CONSTRAINT IF EXISTS st_locacoes_status_check;

-- Atualizar e padronizar registros antigos para os novos termos
UPDATE st_locacoes SET status = 'Alocado' WHERE status = 'Em Rota';
UPDATE st_locacoes SET status = 'Retirada' WHERE status = 'Aguardando Troca';
UPDATE st_locacoes SET status = 'Finalizado' WHERE status = 'Concluído';

-- Criar a restrição definitiva de status
ALTER TABLE st_locacoes ADD CONSTRAINT st_locacoes_status_check 
  CHECK (status IN ('Pendente', 'Alocado', 'Retirada', 'Atrasado', 'Finalizado'));

-- 4. AJUSTE DAS RESTRIÇÕES DE TIPO (st_locacoes)
---------------------------------------------------
-- Apenas para garantir que o tipo não dará erro, removeremos a constraint antiga se existir
ALTER TABLE st_locacoes DROP CONSTRAINT IF EXISTS st_locacoes_tipo_check;

-- Recriar a constraint de Tipo da operação com as opções padrão
ALTER TABLE st_locacoes ADD CONSTRAINT st_locacoes_tipo_check 
  CHECK (tipo IN ('Colocação', 'Troca', 'Retirada'));

-- 5. ATUALIZAR CACHE DA API
---------------------------------------------------
-- É obrigatório notificar o PostgREST para ele reconhecer as mudanças instantaneamente
NOTIFY pgrst, 'reload schema';

COMMIT;
