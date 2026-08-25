-- Habilitar a extensão pgcrypto para UUID se não estiver habilitada
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Tabela: st_financeiro_contas
CREATE TABLE IF NOT EXISTS st_financeiro_contas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID, -- Referência ao cliente/tenant logado
    nome TEXT NOT NULL,
    is_principal BOOLEAN DEFAULT false,
    chave_pix TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela: st_financeiro_categorias
CREATE TABLE IF NOT EXISTS st_financeiro_categorias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID, -- Referência ao cliente/tenant logado
    nome TEXT NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('receita', 'despesa')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela: st_financeiro_lancamentos
CREATE TABLE IF NOT EXISTS st_financeiro_lancamentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID, -- Referência ao cliente/tenant logado
    tipo TEXT NOT NULL CHECK (tipo IN ('receita', 'despesa')),
    descricao TEXT NOT NULL,
    valor NUMERIC(12,2) NOT NULL,
    data_lancamento DATE NOT NULL,
    categoria_id UUID REFERENCES st_financeiro_categorias(id) ON DELETE SET NULL,
    conta_id UUID REFERENCES st_financeiro_contas(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'pago' CHECK (status IN ('pago', 'pendente')),
    tipo_registro TEXT NOT NULL DEFAULT 'unica' CHECK (tipo_registro IN ('unica', 'recorrente', 'parcelada')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir alguns dados iniciais caso precise de teste (opcional)
INSERT INTO st_financeiro_contas (nome) VALUES ('Caixa Físico'), ('Conta Bancária Principal');
INSERT INTO st_financeiro_categorias (nome, tipo) VALUES 
('Locação de Caçambas', 'receita'), 
('Locação de Tambores', 'receita'),
('Taxa de Deslocamento/Frete', 'receita'),
('Venda de Sucata', 'receita'),
('Combustível (Diesel)', 'despesa'),
('Manutenção de Caminhão', 'despesa'),
('Taxas de Descarte (Aterro/Ecoponto)', 'despesa'),
('Manutenção de Caçambas', 'despesa'),
('Salários e Encargos (Motoristas/Ajudantes)', 'despesa'),
('Impostos e Taxas', 'despesa');

-- Reload postgrest
NOTIFY pgrst, 'reload schema';
