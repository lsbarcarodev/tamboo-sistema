-- 1. Adicionar novas colunas na tabela de clientes
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS tipo_pessoa TEXT CHECK (tipo_pessoa IN ('Física', 'Jurídica')) DEFAULT 'Jurídica';
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS documento TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS nome_responsavel TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS email_responsavel TEXT;

-- 2. Criar a tabela de endereços de clientes
CREATE TABLE IF NOT EXISTS enderecos_clientes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
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

-- 3. Habilitar RLS e Permissões (Dropando a policy antes para não dar erro vermelho)
ALTER TABLE enderecos_clientes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read/write access to enderecos_clientes for MVP" ON enderecos_clientes;
CREATE POLICY "Allow public read/write access to enderecos_clientes for MVP" ON enderecos_clientes FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.enderecos_clientes TO anon, authenticated, service_role;

-- 4. Notificar a API para atualizar o cache imediatamente
NOTIFY pgrst, 'reload schema';
