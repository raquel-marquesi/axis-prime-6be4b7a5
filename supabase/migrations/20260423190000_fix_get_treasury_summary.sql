-- Corrige aggregate aninhado em get_treasury_summary.
-- A versão anterior usava json_agg(json_build_object(...SUM()...) ORDER BY ...)
-- com GROUP BY, criando nested aggregates inválidos. Separado em subquery.
CREATE OR REPLACE FUNCTION public.get_treasury_summary(p_start_date date, p_end_date date)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_accounts json;
  v_monthly json;
BEGIN
  IF NOT (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'socio')
    OR public.has_role(auth.uid(), 'gerente')
    OR public.has_role(auth.uid(), 'financeiro')
    OR public.has_role(auth.uid(), 'assistente_financeiro')
  ) THEN
    RAISE EXCEPTION 'Acesso negado: requer role financeiro';
  END IF;

  SELECT json_agg(
    json_build_object(
      'id', ba.id,
      'conta', ba.conta,
      'banco', ba.banco,
      'descricao', ba.descricao,
      'entradas', COALESCE(te.entradas, 0),
      'saidas', COALESCE(te.saidas, 0),
      'saldo', COALESCE(te.entradas, 0) - COALESCE(te.saidas, 0)
    )
  ) INTO v_accounts
  FROM bank_accounts_config ba
  LEFT JOIN (
    SELECT bank_account_id,
           SUM(CASE WHEN tipo = 'entrada' THEN valor ELSE 0 END) as entradas,
           SUM(CASE WHEN tipo IN ('saida', 'transferencia') THEN valor ELSE 0 END) as saidas
    FROM treasury_entries
    WHERE data_movimentacao >= p_start_date AND data_movimentacao <= p_end_date
    GROUP BY bank_account_id
  ) te ON te.bank_account_id = ba.id
  WHERE ba.is_active = true;

  SELECT json_agg(
    json_build_object(
      'month', month,
      'entradas', entradas,
      'saidas', saidas
    ) ORDER BY month
  ) INTO v_monthly
  FROM (
    SELECT
      to_char(data_movimentacao, 'YYYY-MM') AS month,
      SUM(CASE WHEN tipo = 'entrada' THEN valor ELSE 0 END) AS entradas,
      SUM(CASE WHEN tipo IN ('saida', 'transferencia') THEN valor ELSE 0 END) AS saidas
    FROM treasury_entries
    WHERE data_movimentacao >= p_start_date AND data_movimentacao <= p_end_date
    GROUP BY to_char(data_movimentacao, 'YYYY-MM')
  ) monthly_data;

  RETURN json_build_object(
    'accounts', COALESCE(v_accounts, '[]'::json),
    'monthlyData', COALESCE(v_monthly, '[]'::json)
  );
END;
$function$;
