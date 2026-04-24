
DO $$
BEGIN
  WITH new_sols AS (
    INSERT INTO solicitacoes (origem, titulo, process_id, client_id, data_limite, status, prioridade)
    SELECT
      'planilha_5_clientes',
      pd.ocorrencia || ' - ' || p.numero_processo,
      pd.process_id,
      p.id_cliente,
      pd.data_prazo,
      'pendente',
      'media'
    FROM process_deadlines pd
    JOIN processes p ON p.id = pd.process_id
    WHERE pd.source = 'planilha_cliente'
      AND pd.is_completed = false
      AND pd.solicitacao_id IS NULL
    RETURNING id, process_id, data_limite
  )
  UPDATE process_deadlines pd
  SET solicitacao_id = ns.id
  FROM new_sols ns
  WHERE pd.process_id = ns.process_id
    AND pd.data_prazo = ns.data_limite
    AND pd.source = 'planilha_cliente'
    AND pd.is_completed = false
    AND pd.solicitacao_id IS NULL;
EXCEPTION WHEN undefined_table OR undefined_column THEN
  NULL;
END $$;
