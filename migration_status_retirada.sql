-- Remover a restrição antiga
ALTER TABLE st_locacoes DROP CONSTRAINT IF EXISTS st_locacoes_status_check;

-- Atualizar possíveis registros antigos que ainda estejam como 'Aguardando Troca' para 'Retirada'
UPDATE st_locacoes SET status = 'Retirada' WHERE status = 'Aguardando Troca';

-- Criar a nova restrição adicionando 'Retirada' no lugar de 'Aguardando Troca'
ALTER TABLE st_locacoes ADD CONSTRAINT st_locacoes_status_check 
  CHECK (status IN ('Pendente', 'Alocado', 'Retirada', 'Atrasado', 'Finalizado'));

-- Notificar o Supabase para atualizar o cache da API
NOTIFY pgrst, 'reload schema';
