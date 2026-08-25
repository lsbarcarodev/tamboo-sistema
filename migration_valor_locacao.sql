ALTER TABLE st_locacoes ADD COLUMN IF NOT EXISTS valor_locacao NUMERIC(12,2);
NOTIFY pgrst, 'reload schema';
