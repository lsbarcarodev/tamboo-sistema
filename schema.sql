-- Create the "clientes" table
CREATE TABLE IF NOT EXISTS clientes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  telefone TEXT,
  endereco_padrao TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create the "locacoes" (pedidos) table
CREATE TABLE IF NOT EXISTS locacoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo TEXT UNIQUE NOT NULL, -- Ex: PED-001
  cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
  cliente_nome TEXT NOT NULL, -- Denormalizado para agilidade na UI
  equipamento TEXT NOT NULL CHECK (equipamento IN ('Caçamba', 'Tambor')) DEFAULT 'Tambor',
  quantidade INTEGER NOT NULL DEFAULT 1,
  tipo TEXT NOT NULL CHECK (tipo IN ('Colocação', 'Troca', 'Retirada')),
  status TEXT NOT NULL CHECK (status IN ('Pendente', 'Em Rota', 'Concluído')),
  endereco_entrega TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS (Row Level Security) - Basic setup (Optional, for now allowing all for MVP)
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE locacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read/write access to clientes for MVP" ON clientes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write access to locacoes for MVP" ON locacoes FOR ALL USING (true) WITH CHECK (true);

-- Permissions for API access
GRANT ALL ON TABLE public.locacoes TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.clientes TO anon, authenticated, service_role;
