-- ============================================================
-- SQL RPC: Treasury Aggregation (Bypass PostgREST 1000 limit)
-- ============================================================

CREATE OR REPLACE FUNCTION get_treasury_summary(p_start_date date, p_end_date date)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_accounts json;
  v_monthly json;
BEGIN
  -- Aggregate totals per Bank Account directly from the Database
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

  -- Aggregate totals per Month to populate Dashboard Charts
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
$$;
