-- Adiciona colunas de latitude e longitude
ALTER TABLE st_locacoes ADD COLUMN IF NOT EXISTS lat NUMERIC(10, 8);
ALTER TABLE st_locacoes ADD COLUMN IF NOT EXISTS lng NUMERIC(11, 8);

-- Atualiza a API do Supabase (recarrega esquema)
NOTIFY pgrst, 'reload schema';
