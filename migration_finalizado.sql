ALTER TABLE st_locacoes DROP CONSTRAINT IF EXISTS st_locacoes_status_check;
UPDATE st_locacoes SET status = 'Finalizado' WHERE status = 'Concluído';
ALTER TABLE st_locacoes ADD CONSTRAINT st_locacoes_status_check 
  CHECK (status IN ('Pendente', 'Alocado', 'Aguardando Troca', 'Atrasado', 'Finalizado'));
NOTIFY pgrst, 'reload schema';
