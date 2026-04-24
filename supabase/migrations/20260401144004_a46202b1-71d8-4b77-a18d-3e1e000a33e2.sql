
DO $$
BEGIN
  UPDATE process_deadlines pd
  SET solicitacao_id = sub.sol_id
  FROM (
    SELECT DISTINCT ON (pd2.id)
      pd2.id AS deadline_id,
      s.id AS sol_id
    FROM process_deadlines pd2
    JOIN solicitacoes s
      ON s.process_id = pd2.process_id
      AND s.data_limite::date = pd2.data_prazo
    WHERE pd2.source = 'planilha_cliente'
      AND pd2.is_completed = false
      AND pd2.solicitacao_id IS NULL
    ORDER BY pd2.id, s.created_at DESC
  ) sub
  WHERE pd.id = sub.deadline_id;
EXCEPTION WHEN undefined_table OR undefined_column THEN
  NULL;
END $$;
