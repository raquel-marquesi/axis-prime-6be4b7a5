-- ============================================================
-- RPC: get_financial_dre_summary
-- Calculates raw sums without hitting the 1000 row limits.
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_financial_dre_summary(p_start_date date, p_end_date date)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT jsonb_build_object(
    'receitaBruta', COALESCE((SELECT sum(valor) FROM invoices WHERE data_emissao >= p_start_date AND data_emissao <= p_end_date), 0),
    'receitaRealizada', COALESCE((SELECT sum(valor) FROM invoices WHERE data_emissao >= p_start_date AND data_emissao <= p_end_date AND status = 'paga'), 0),
    'despesasTotal', COALESCE((SELECT sum(valor) FROM expenses WHERE data_vencimento >= p_start_date AND data_vencimento <= p_end_date AND status = 'paga'), 0),
    'despesasAdmin', COALESCE((SELECT sum(valor) FROM expenses WHERE data_vencimento >= p_start_date AND data_vencimento <= p_end_date AND status = 'paga' AND categoria IN ('administrativa', 'aluguel', 'utilidades')), 0),
    'despesasPessoal', COALESCE((SELECT sum(valor) FROM expenses WHERE data_vencimento >= p_start_date AND data_vencimento <= p_end_date AND status = 'paga' AND categoria IN ('pessoal', 'salarios', 'beneficios')), 0)
  );
$$;

-- ============================================================
-- RPC: get_revenue_projection
-- Calculates open deadlines projection using true DB values.
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_revenue_projection()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_result jsonb;
BEGIN
  WITH open_deadlines AS (
    SELECT 
      pd.id, 
      pr.id_cliente, 
      COALESCE(c.razao_social, c.nome, 'Sem Cliente') AS client_name,
      pd.ocorrencia AS tipo_evento
    FROM process_deadlines pd
    JOIN processes pr ON pr.id = pd.process_id
    LEFT JOIN clients c ON c.id = pr.id_cliente
    WHERE pd.is_completed = false
  ),
  client_event_counts AS (
    SELECT 
      id_cliente,
      client_name,
      tipo_evento,
      count(*) as event_count
    FROM open_deadlines
    GROUP BY id_cliente, client_name, tipo_evento
  ),
  -- Precificação por Client ID exato + Tipo Calculo
  pricing_by_id AS (
    SELECT client_id, upper(trim(tipo_calculo)) as event_key, valor
    FROM contract_pricing
    WHERE is_active = true AND valor > 0 AND client_id IS NOT NULL
  ),
  -- Precificação por Nome do Cliente + Tipo Calculo (fallback legacy)
  pricing_by_name AS (
    SELECT upper(trim(cliente_nome)) as c_name, upper(trim(tipo_calculo)) as event_key, valor
    FROM contract_pricing
    WHERE is_active = true AND valor > 0 AND client_id IS NULL
  ),
  matched_events AS (
    SELECT 
      cec.client_name as "clientName",
      cec.event_count,
      COALESCE(
        pid.valor,
        pname.valor,
        0
      ) as matched_valor
    FROM client_event_counts cec
    LEFT JOIN pricing_by_id pid ON pid.client_id = cec.id_cliente AND pid.event_key = upper(trim(cec.tipo_evento))
    LEFT JOIN pricing_by_name pname ON pname.c_name = upper(trim(cec.client_name)) AND pname.event_key = upper(trim(cec.tipo_evento))
  ),
  client_aggregations AS (
    SELECT 
      "clientName",
      sum(event_count) as "deadlineCount",
      sum(event_count * matched_valor) as "projectedRevenue",
      CASE WHEN sum(matched_valor) > 0 THEN sum(event_count * matched_valor) / sum(event_count) ELSE 0 END as "avgPrice",
      CASE WHEN min(matched_valor) > 0 THEN 'contrato' ELSE 'estimado' END as "source"
    FROM matched_events
    GROUP BY "clientName"
  )
  SELECT jsonb_build_object(
    'projections', COALESCE((SELECT jsonb_agg(row_to_json(p)) FROM (SELECT * FROM client_aggregations ORDER BY "projectedRevenue" DESC) p), '[]'::jsonb),
    'totalGeneral', COALESCE((SELECT sum("projectedRevenue") FROM client_aggregations), 0),
    'totalContrato', COALESCE((SELECT sum("projectedRevenue") FROM client_aggregations WHERE source = 'contrato'), 0),
    'totalEstimado', COALESCE((SELECT sum("projectedRevenue") FROM client_aggregations WHERE source = 'estimado'), 0),
    'totalPrazos', COALESCE((SELECT sum("deadlineCount") FROM client_aggregations),  0)
  ) INTO v_result;

  RETURN v_result;
END;
$$;
