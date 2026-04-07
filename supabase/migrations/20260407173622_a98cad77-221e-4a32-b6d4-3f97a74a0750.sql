
CREATE OR REPLACE FUNCTION public.get_all_deadlines_with_details(
  p_user_id uuid DEFAULT NULL,
  p_team_user_ids uuid[] DEFAULT NULL,
  p_date_from date DEFAULT NULL,
  p_date_to date DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  process_id uuid,
  data_prazo date,
  ocorrencia text,
  detalhes text,
  is_completed boolean,
  assigned_to uuid,
  completed_by uuid,
  ultimo_andamento text,
  solicitacao_id uuid,
  numero_processo text,
  numero_pasta integer,
  reclamante_nome text,
  reclamadas text[],
  area text,
  assigned_user_name text,
  completed_by_name text,
  solicitacao_titulo text,
  solicitacao_prioridade text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    pd.id,
    pd.process_id,
    pd.data_prazo,
    pd.ocorrencia,
    pd.detalhes,
    COALESCE(pd.is_completed, false) AS is_completed,
    pd.assigned_to,
    pd.completed_by,
    pd.ultimo_andamento,
    pd.solicitacao_id,
    p.numero_processo,
    p.numero_pasta,
    p.reclamante_nome,
    p.reclamadas,
    p.area,
    pa.full_name AS assigned_user_name,
    pc.full_name AS completed_by_name,
    s.titulo AS solicitacao_titulo,
    s.prioridade AS solicitacao_prioridade
  FROM process_deadlines pd
  INNER JOIN processes p ON p.id = pd.process_id
  LEFT JOIN profiles pa ON pa.user_id = pd.assigned_to
  LEFT JOIN profiles pc ON pc.user_id = pd.completed_by
  LEFT JOIN solicitacoes s ON s.id = pd.solicitacao_id
  WHERE
    (p_date_from IS NULL OR pd.data_prazo >= p_date_from)
    AND (p_date_to IS NULL OR pd.data_prazo <= p_date_to)
    AND (
      p_user_id IS NULL
      OR pd.assigned_to = p_user_id
      OR (p_team_user_ids IS NOT NULL AND pd.assigned_to = ANY(p_team_user_ids))
    )
  ORDER BY pd.data_prazo ASC;
$$;
