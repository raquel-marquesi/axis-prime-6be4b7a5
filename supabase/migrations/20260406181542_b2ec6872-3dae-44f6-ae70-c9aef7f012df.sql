CREATE OR REPLACE FUNCTION public.get_prazos_abertos_report()
RETURNS TABLE(
  id uuid,
  processo text,
  numero_pasta text,
  reclamante text,
  reclamadas text,
  area text,
  cliente text,
  ocorrencia text,
  data_prazo date,
  responsavel text,
  source text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT
    pd.id,
    COALESCE(pr.numero_processo, '—')::text,
    COALESCE(pr.numero_pasta::text, '—')::text,
    COALESCE(pr.reclamante_nome, '—')::text,
    COALESCE(array_to_string(pr.reclamadas, ', '), '—')::text,
    COALESCE(pr.area::text, '—')::text,
    COALESCE(c.razao_social, c.nome, '—')::text,
    COALESCE(pd.ocorrencia, '—')::text,
    pd.data_prazo,
    COALESCE(p.full_name, 'Não atribuído')::text,
    COALESCE(pd.source, '—')::text
  FROM process_deadlines pd
  LEFT JOIN processes pr ON pr.id = pd.process_id
  LEFT JOIN clients c ON c.id = pr.id_cliente
  LEFT JOIN profiles p ON p.user_id = pd.assigned_to
  WHERE pd.is_completed = false
  ORDER BY pd.data_prazo ASC;
$$;