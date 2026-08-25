-- =================================================================================
-- MIGRATION SAAS DEFINITIVA: BLINDAGEM E MULTI-TENANT
-- Esse script cria o isolamento de dados sem que a gente precise reescrever o código do site.
-- =================================================================================

-- 1. Criar Tabelas de Empresa
CREATE TABLE IF NOT EXISTS public.st_empresas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome_fantasia TEXT NOT NULL DEFAULT 'Minha Empresa',
    stripe_customer_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.st_usuarios_empresas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    empresa_id UUID NOT NULL REFERENCES public.st_empresas(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'admin',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, empresa_id)
);

-- 2. Adicionar o "Crachá da Empresa" nas tabelas existentes
ALTER TABLE public.st_clientes ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES public.st_empresas(id) ON DELETE CASCADE;
ALTER TABLE public.st_enderecos ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES public.st_empresas(id) ON DELETE CASCADE;
ALTER TABLE public.st_locacoes ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES public.st_empresas(id) ON DELETE CASCADE;
ALTER TABLE public.st_equipamentos ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES public.st_empresas(id) ON DELETE CASCADE;

-- 3. SALVAR OS DADOS EXISTENTES (Para você não perder nada)
-- Vamos criar uma empresa "Mestre" e jogar tudo que já existe nela.
DO $$ 
DECLARE 
    mestre_empresa_id UUID;
    primeiro_user_id UUID;
BEGIN
    -- Verifica se já existe uma empresa, se não, cria.
    SELECT id INTO mestre_empresa_id FROM public.st_empresas LIMIT 1;
    IF mestre_empresa_id IS NULL THEN
        INSERT INTO public.st_empresas (nome_fantasia) VALUES ('Empresa Mestre (Legado)') RETURNING id INTO mestre_empresa_id;
    END IF;

    -- Pega o seu usuário e vincula a essa empresa
    SELECT id INTO primeiro_user_id FROM auth.users ORDER BY created_at ASC LIMIT 1;
    IF primeiro_user_id IS NOT NULL THEN
        INSERT INTO public.st_usuarios_empresas (user_id, empresa_id) VALUES (primeiro_user_id, mestre_empresa_id) ON CONFLICT DO NOTHING;
    END IF;

    -- Atualiza todos os dados sem dono para pertencerem a essa empresa
    UPDATE public.st_clientes SET empresa_id = mestre_empresa_id WHERE empresa_id IS NULL;
    UPDATE public.st_enderecos SET empresa_id = mestre_empresa_id WHERE empresa_id IS NULL;
    UPDATE public.st_locacoes SET empresa_id = mestre_empresa_id WHERE empresa_id IS NULL;
    UPDATE public.st_equipamentos SET empresa_id = mestre_empresa_id WHERE empresa_id IS NULL;
END $$;

-- 4. O SEGREDO MÁGICO: Preencher automático nos novos cadastros
-- Sem precisar mudar o código do site, o banco de dados descobre a empresa do usuário logado sozinho!
CREATE OR REPLACE FUNCTION get_auth_empresa_id() RETURNS UUID AS $$
    SELECT empresa_id FROM public.st_usuarios_empresas WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE;

ALTER TABLE public.st_clientes ALTER COLUMN empresa_id SET DEFAULT get_auth_empresa_id();
ALTER TABLE public.st_enderecos ALTER COLUMN empresa_id SET DEFAULT get_auth_empresa_id();
ALTER TABLE public.st_locacoes ALTER COLUMN empresa_id SET DEFAULT get_auth_empresa_id();
ALTER TABLE public.st_equipamentos ALTER COLUMN empresa_id SET DEFAULT get_auth_empresa_id();

-- 5. AUTOMAÇÃO DE NOVOS USUÁRIOS (Quando um cliente comprar o sistema)
-- Ao criar um login novo, ele cria uma empresa nova limpa para o cara automaticamente.
CREATE OR REPLACE FUNCTION public.handle_new_user_empresa() 
RETURNS TRIGGER AS $$
DECLARE
    nova_empresa_id UUID;
BEGIN
    INSERT INTO public.st_empresas (nome_fantasia) VALUES ('Empresa de ' || NEW.email) RETURNING id INTO nova_empresa_id;
    INSERT INTO public.st_usuarios_empresas (user_id, empresa_id, role) VALUES (NEW.id, nova_empresa_id, 'admin');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_empresa ON auth.users;
CREATE TRIGGER on_auth_user_created_empresa
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user_empresa();

-- 6. ATIVAR A BLINDAGEM DE DADOS (RLS)
ALTER TABLE public.st_clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.st_enderecos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.st_locacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.st_equipamentos ENABLE ROW LEVEL SECURITY;

-- Apaga políticas antigas se existirem
DROP POLICY IF EXISTS "Isolamento Clientes" ON public.st_clientes;
DROP POLICY IF EXISTS "Isolamento Enderecos" ON public.st_enderecos;
DROP POLICY IF EXISTS "Isolamento Locacoes" ON public.st_locacoes;
DROP POLICY IF EXISTS "Isolamento Equipamentos" ON public.st_equipamentos;

-- Cria as políticas de segurança absolutas
CREATE POLICY "Isolamento Clientes" ON public.st_clientes FOR ALL USING (empresa_id = get_auth_empresa_id());
CREATE POLICY "Isolamento Enderecos" ON public.st_enderecos FOR ALL USING (empresa_id = get_auth_empresa_id());
CREATE POLICY "Isolamento Locacoes" ON public.st_locacoes FOR ALL USING (empresa_id = get_auth_empresa_id());
CREATE POLICY "Isolamento Equipamentos" ON public.st_equipamentos FOR ALL USING (empresa_id = get_auth_empresa_id());

-- PRONTO! Sistema SaaS blindado.
