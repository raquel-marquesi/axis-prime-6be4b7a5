
DO $$
BEGIN
  INSERT INTO process_deadlines (process_id, data_prazo, ocorrencia, detalhes, assigned_to, source, is_completed, solicitacao_id)
  SELECT DISTINCT ON (s.process_id, s.data_limite::date, LEFT(s.titulo, 120))
    s.process_id,
    s.data_limite::date,
    LEFT(s.titulo, 120),
    LEFT(s.descricao, 500),
    s.assigned_to,
    'planilha_cliente',
    false,
    s.id
  FROM solicitacoes s
  WHERE s.origem = 'email_sheet'
    AND s.process_id IS NOT NULL
    AND s.data_limite IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM process_deadlines pd WHERE pd.solicitacao_id = s.id
    )
  ORDER BY s.process_id, s.data_limite::date, LEFT(s.titulo, 120), s.created_at DESC
  ON CONFLICT (process_id, data_prazo, ocorrencia) WHERE is_completed = false
  DO UPDATE SET solicitacao_id = EXCLUDED.solicitacao_id;
EXCEPTION WHEN undefined_table OR undefined_column THEN
  NULL;
END $$;
