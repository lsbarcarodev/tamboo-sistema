-- migration_locacoes_financeiro.sql
-- Adiciona colunas para MTR e integração com módulo financeiro

-- 1. Adiciona coluna para o MTR (Manifesto de Transporte de Resíduos)
ALTER TABLE st_locacoes 
ADD COLUMN IF NOT EXISTS mtr TEXT;

-- 2. Adiciona colunas para a forma de pagamento e status
ALTER TABLE st_locacoes 
ADD COLUMN IF NOT EXISTS forma_pagamento TEXT,
ADD COLUMN IF NOT EXISTS pago BOOLEAN DEFAULT FALSE;

-- 3. Adiciona a referência para o lançamento financeiro caso precise sincronizar
ALTER TABLE st_locacoes 
ADD COLUMN IF NOT EXISTS financeiro_lancamento_id UUID REFERENCES st_financeiro_lancamentos(id) ON DELETE SET NULL;

-- Garante permissões
GRANT ALL ON TABLE st_locacoes TO authenticated;
GRANT ALL ON TABLE st_locacoes TO service_role;
