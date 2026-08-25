-- =====================================================================
-- MIGRATION DEFINITIVA - BACKEND TAMBOO
-- Execute inteiro no SQL Editor do Supabase
-- Seguro para re-executar (idempotente)
-- =====================================================================

BEGIN;

-- =====================================================================
-- 1. GARANTIR ESTRUTURA DA TABELA st_motoristas
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.st_motoristas (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    empresa_id  UUID REFERENCES public.st_empresas(id) ON DELETE CASCADE,
    nome        TEXT NOT NULL,
    telefone    TEXT,
    email       TEXT,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adicionar coluna email caso nao exista
ALTER TABLE public.st_motoristas ADD COLUMN IF NOT EXISTS email TEXT;

-- =====================================================================
-- 2. CORRIGIR CONSTRAINT DE TIPO EM st_locacoes
--    Remove "Troca" - operacoes sao apenas Colocacao e Retirada
-- =====================================================================
ALTER TABLE public.st_locacoes DROP CONSTRAINT IF EXISTS st_locacoes_tipo_check;

-- Converte qualquer "Troca" existente para "Retirada"
UPDATE public.st_locacoes SET tipo = 'Retirada' WHERE tipo = 'Troca';

-- Nova constraint sem "Troca"
ALTER TABLE public.st_locacoes ADD CONSTRAINT st_locacoes_tipo_check
    CHECK (tipo IN ('Colocacao', 'Retirada', 'Locacao', 'Colocação', 'Locação'));

-- =====================================================================
-- 3. CORRIGIR CONSTRAINT DE STATUS EM st_locacoes
-- =====================================================================
ALTER TABLE public.st_locacoes DROP CONSTRAINT IF EXISTS st_locacoes_status_check;

ALTER TABLE public.st_locacoes ADD CONSTRAINT st_locacoes_status_check
    CHECK (status IN ('Pendente', 'Alocado', 'Retirada', 'Atrasado', 'Finalizado'));

-- =====================================================================
-- 4. FUNCAO get_auth_empresa_id
-- =====================================================================
CREATE OR REPLACE FUNCTION public.get_auth_empresa_id()
RETURNS UUID AS $$
    SELECT empresa_id
    FROM public.st_usuarios_empresas
    WHERE user_id = auth.uid()
    LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- =====================================================================
-- 5. TRIGGER DE NOVO USUARIO - NAO criar empresa para motoristas
-- =====================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user_empresa()
RETURNS TRIGGER AS $$
DECLARE
    nova_empresa_id UUID;
BEGIN
    -- Motoristas sao vinculados pela API do admin, nao precisam de empresa propria
    IF (NEW.raw_user_meta_data->>'role') = 'motorista' THEN
        RETURN NEW;
    END IF;

    INSERT INTO public.st_empresas (nome_fantasia)
        VALUES ('Empresa de ' || COALESCE(NEW.email, NEW.id::text))
        RETURNING id INTO nova_empresa_id;

    INSERT INTO public.st_usuarios_empresas (user_id, empresa_id, role)
        VALUES (NEW.id, nova_empresa_id, 'admin')
        ON CONFLICT (user_id, empresa_id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_empresa ON auth.users;
CREATE TRIGGER on_auth_user_created_empresa
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user_empresa();

-- =====================================================================
-- 6. RLS - POLITICAS DE SEGURANCA COMPLETAS
-- =====================================================================

-- st_clientes
ALTER TABLE public.st_clientes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Isolamento Clientes" ON public.st_clientes;
CREATE POLICY "Isolamento Clientes" ON public.st_clientes
    FOR ALL USING (empresa_id = public.get_auth_empresa_id());

-- st_locacoes
ALTER TABLE public.st_locacoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Isolamento Locacoes" ON public.st_locacoes;
CREATE POLICY "Isolamento Locacoes" ON public.st_locacoes
    FOR ALL USING (empresa_id = public.get_auth_empresa_id());

-- st_equipamentos
ALTER TABLE public.st_equipamentos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Isolamento Equipamentos" ON public.st_equipamentos;
CREATE POLICY "Isolamento Equipamentos" ON public.st_equipamentos
    FOR ALL USING (empresa_id = public.get_auth_empresa_id());

-- st_motoristas - admin ve todos da empresa, motorista ve so o proprio perfil
ALTER TABLE public.st_motoristas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Isolamento Motoristas" ON public.st_motoristas;
DROP POLICY IF EXISTS "Admin ve motoristas" ON public.st_motoristas;
DROP POLICY IF EXISTS "Motorista ve proprio perfil" ON public.st_motoristas;

CREATE POLICY "Admin ve motoristas" ON public.st_motoristas
    FOR ALL USING (empresa_id = public.get_auth_empresa_id());

CREATE POLICY "Motorista ve proprio perfil" ON public.st_motoristas
    FOR SELECT USING (user_id = auth.uid());

-- st_usuarios_empresas
ALTER TABLE public.st_usuarios_empresas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Usuario ve proprio vinculo" ON public.st_usuarios_empresas;
CREATE POLICY "Usuario ve proprio vinculo" ON public.st_usuarios_empresas
    FOR SELECT USING (user_id = auth.uid());

-- st_empresas
ALTER TABLE public.st_empresas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin ve propria empresa" ON public.st_empresas;
CREATE POLICY "Admin ve propria empresa" ON public.st_empresas
    FOR SELECT USING (id = public.get_auth_empresa_id());

-- =====================================================================
-- 7. REALTIME - GARANTIR PUBLICACAO NAS TABELAS PRINCIPAIS
-- =====================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND tablename = 'st_locacoes'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.st_locacoes;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND tablename = 'st_equipamentos'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.st_equipamentos;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND tablename = 'st_motoristas'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.st_motoristas;
    END IF;
END $$;

-- =====================================================================
-- 8. DEFAULTS AUTOMATICOS - empresa_id preenchido pelo banco
-- =====================================================================
ALTER TABLE public.st_clientes     ALTER COLUMN empresa_id SET DEFAULT public.get_auth_empresa_id();
ALTER TABLE public.st_locacoes     ALTER COLUMN empresa_id SET DEFAULT public.get_auth_empresa_id();
ALTER TABLE public.st_equipamentos ALTER COLUMN empresa_id SET DEFAULT public.get_auth_empresa_id();

-- =====================================================================
-- 9. NOTIFICAR POSTGREST
-- =====================================================================
NOTIFY pgrst, 'reload schema';

COMMIT;
