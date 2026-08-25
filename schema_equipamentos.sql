-- Tabela para o cadastro individual de equipamentos

CREATE TABLE IF NOT EXISTS st_equipamentos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo_interno TEXT NOT NULL UNIQUE, -- Ex: T-001, CAC-05
  tipo TEXT NOT NULL CHECK (tipo IN ('Tambor', 'Caçamba')),
  status TEXT NOT NULL CHECK (status IN ('Disponível', 'Alocado', 'Manutenção', 'Inativo')) DEFAULT 'Disponível',
  capacidade TEXT, -- Ex: 200L, 5m3
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS e Permissões
ALTER TABLE st_equipamentos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read/write access to st_equipamentos for MVP" ON st_equipamentos;
CREATE POLICY "Allow public read/write access to st_equipamentos for MVP" ON st_equipamentos FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.st_equipamentos TO anon, authenticated, service_role;

-- Notificar a API para atualizar o cache
NOTIFY pgrst, 'reload schema';
