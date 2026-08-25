-- Adicionar novas colunas na tabela st_financeiro_contas
ALTER TABLE st_financeiro_contas
ADD COLUMN IF NOT EXISTS is_principal BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS chave_pix TEXT;

-- Garantir que pelo menos uma conta seja a principal, se houver contas
UPDATE st_financeiro_contas SET is_principal = true WHERE id IN (
  SELECT id FROM st_financeiro_contas ORDER BY created_at ASC LIMIT 1
);

-- Recarregar o postgrest para aplicar as mudanças na API do Supabase
NOTIFY pgrst, 'reload schema';
