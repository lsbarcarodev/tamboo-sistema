-- Tabelas isoladas para o SaaS de Tambores com prefixo "st_"

-- 1. Tabela de Clientes
CREATE TABLE IF NOT EXISTS st_clientes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tipo_pessoa TEXT CHECK (tipo_pessoa IN ('Física', 'Jurídica')) DEFAULT 'Jurídica',
  documento TEXT,
  nome TEXT NOT NULL,
  nome_responsavel TEXT,
  email_responsavel TEXT,
  telefone TEXT,
  endereco_padrao TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabela de Endereços
CREATE TABLE IF NOT EXISTS st_enderecos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id UUID REFERENCES st_clientes(id) ON DELETE CASCADE,
  cep TEXT NOT NULL,
  logradouro TEXT NOT NULL,
  numero TEXT NOT NULL,
  complemento TEXT,
  bairro TEXT NOT NULL,
  cidade TEXT NOT NULL,
  uf TEXT NOT NULL,
  is_padrao BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabela de Locações (Pedidos)
CREATE TABLE IF NOT EXISTS st_locacoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo TEXT UNIQUE NOT NULL, -- Ex: PED-001
  cliente_id UUID REFERENCES st_clientes(id) ON DELETE CASCADE,
  cliente_nome TEXT NOT NULL,
  equipamento TEXT NOT NULL CHECK (equipamento IN ('Caçamba', 'Tambor')) DEFAULT 'Tambor',
  quantidade INTEGER NOT NULL DEFAULT 1,
  tipo TEXT NOT NULL CHECK (tipo IN ('Colocação', 'Troca', 'Retirada')),
  status TEXT NOT NULL CHECK (status IN ('Pendente', 'Em Rota', 'Concluído')),
  endereco_entrega TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Habilitar RLS e Permissões de forma segura
ALTER TABLE st_clientes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read/write access to st_clientes for MVP" ON st_clientes;
CREATE POLICY "Allow public read/write access to st_clientes for MVP" ON st_clientes FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.st_clientes TO anon, authenticated, service_role;

ALTER TABLE st_enderecos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read/write access to st_enderecos for MVP" ON st_enderecos;
CREATE POLICY "Allow public read/write access to st_enderecos for MVP" ON st_enderecos FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.st_enderecos TO anon, authenticated, service_role;

ALTER TABLE st_locacoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read/write access to st_locacoes for MVP" ON st_locacoes;
CREATE POLICY "Allow public read/write access to st_locacoes for MVP" ON st_locacoes FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.st_locacoes TO anon, authenticated, service_role;

-- 5. Notificar a API para atualizar o cache
NOTIFY pgrst, 'reload schema';
