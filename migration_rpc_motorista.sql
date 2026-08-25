-- migration_rpc_motorista.sql
-- Função RPC (Remote Procedure Call) para contornar o problema de cache do PostgREST.
-- Esta função atualiza o status e a URL do comprovante diretamente no banco de dados.
-- Também registra que a atualização foi feita pelo Motorista e a data/hora do comprovante.

CREATE OR REPLACE FUNCTION atualizar_entrega_motorista(
    p_id UUID,
    p_status TEXT,
    p_url TEXT
) 
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE st_locacoes 
  SET 
    status = p_status,
    comprovante_url = p_url,
    comprovante_at = NOW(),
    updated_at = NOW(),
    updated_by = 'Motorista'
  WHERE id = p_id;
END;
$$;

-- Dá permissão para os usuários autenticados e anônimos usarem a função
GRANT EXECUTE ON FUNCTION atualizar_entrega_motorista(UUID, TEXT, TEXT) TO anon, authenticated;

-- Força uma recarga do cache novamente (apenas por precaução)
NOTIFY pgrst, 'reload schema';

