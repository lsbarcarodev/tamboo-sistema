ALTER TABLE st_locacoes ADD COLUMN IF NOT EXISTS equipamento_id UUID REFERENCES st_equipamentos(id);
ALTER TABLE st_locacoes ADD COLUMN IF NOT EXISTS equipamento_codigo TEXT;
NOTIFY pgrst, 'reload schema';
