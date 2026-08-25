-- Adiciona colunas para armazenar as credenciais geradas automaticamente
ALTER TABLE public.st_motoristas ADD COLUMN IF NOT EXISTS app_email TEXT;
ALTER TABLE public.st_motoristas ADD COLUMN IF NOT EXISTS app_senha TEXT;

-- Opcional: Para manter os motoristas antigos funcionando se alguém for enviar o app para eles, 
-- precisaremos excluí-los e criá-los de novo pela tela, pois eles não possuem essas colunas preenchidas.
