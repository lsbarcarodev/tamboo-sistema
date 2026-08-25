-- migration_trigger_status.sql
-- Garante que o banco de dados (backend) atualize o status do equipamento
-- automaticamente sempre que o status da locação mudar ou o pedido for excluído.

CREATE OR REPLACE FUNCTION atualiza_status_equipamento_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- Ao EXCLUIR um pedido, libera o equipamento vinculado
  IF TG_OP = 'DELETE' THEN
    IF OLD.equipamento_id IS NOT NULL THEN
      UPDATE st_equipamentos SET status = 'Disponível' WHERE id = OLD.equipamento_id;
    END IF;
    RETURN OLD;
  END IF;

  -- Ao INSERIR ou ATUALIZAR, sincroniza o status
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) OR (TG_OP = 'INSERT') THEN
    IF NEW.equipamento_id IS NOT NULL THEN
      IF NEW.status = 'Alocado' THEN
        UPDATE st_equipamentos SET status = 'Alocado' WHERE id = NEW.equipamento_id;
      ELSIF NEW.status IN ('Finalizado', 'Pendente') THEN
        UPDATE st_equipamentos SET status = 'Disponível' WHERE id = NEW.equipamento_id;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_status_equipamento ON st_locacoes;

CREATE TRIGGER trigger_sync_status_equipamento
AFTER INSERT OR UPDATE OF status OR DELETE
ON st_locacoes
FOR EACH ROW
EXECUTE FUNCTION atualiza_status_equipamento_trigger();

-- Recarrega o cache do PostgREST para o Next.js reconhecer possíveis novas colunas
NOTIFY pgrst, 'reload schema';
