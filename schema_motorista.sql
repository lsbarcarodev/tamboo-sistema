-- 1. Adicionar coluna para a URL da foto do comprovante
ALTER TABLE st_locacoes ADD COLUMN IF NOT EXISTS comprovante_url TEXT;

-- 2. Configurar Storage para Comprovantes
-- Criar bucket se não existir
INSERT INTO storage.buckets (id, name, public) 
VALUES ('comprovantes', 'comprovantes', true)
ON CONFLICT (id) DO NOTHING;

-- Definir política de RLS para o bucket (permitir upload e leitura pública no MVP)
-- Atenção: num ambiente real, você limitaria o upload apenas a usuários autenticados.
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'comprovantes');

CREATE POLICY "Allow public upload" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'comprovantes');

-- Reload postgrest
NOTIFY pgrst, 'reload schema';
