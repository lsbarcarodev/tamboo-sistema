-- =====================================================================
-- ADICIONA COLUNA DE HORÁRIO NA TABELA ST_LOCACOES
-- =====================================================================

ALTER TABLE public.st_locacoes ADD COLUMN IF NOT EXISTS horario TEXT;

-- Atualizar cache do postgrest
NOTIFY pgrst, 'reload schema';
