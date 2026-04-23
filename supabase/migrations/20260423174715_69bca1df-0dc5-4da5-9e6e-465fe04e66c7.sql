-- Helper inline: cada função verifica role no início via has_role.
-- Recriar funções com guard de role.

-- ===== get_financial_dre_summary =====
CREATE OR REPLACE FUNCTION public.get_financial_dre_summary(p_start_date date, p_end_date date)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  RETURN (
    SELECT jsonb_build_object(
      'receitaBruta', COALESCE((SELECT sum(valor) FROM invoices WHERE data_emissao >= p_start_date AND data_emissao <= p_end_date), 0),
      'receitaRealizada', COALESCE((SELECT sum(valor) FROM invoices WHERE data_emissao >= p_start_date AND data_emissao <= p_end_date AND status = 'paga'), 0),
      'despesasTotal', COALESCE((SELECT sum(valor) FROM expenses WHERE data_vencimento >= p_start_date AND data_vencimento <= p_end_date AND status = 'paga'), 0),
      'despesasAdmin', COALESCE((SELECT sum(valor) FROM expenses WHERE data_vencimento >= p_start_date AND data_vencimento <= p_end_date AND status = 'paga' AND categoria IN ('administrativa', 'aluguel', 'utilidades')), 0),
      'despesasPessoal', COALESCE((SELECT sum(valor) FROM expenses WHERE data_vencimento >= p_start_date AND data_vencimento <= p_end_date AND status = 'paga' AND categoria IN ('pessoal', 'salarios', 'beneficios')), 0)
    )
  );
END;
$function$;

-- ===== get_cashflow_summary =====
CREATE OR REPLACE FUNCTION public.get_cashflow_summary(p_start_date date, p_end_date date, p_branch_ids uuid[] DEFAULT NULL::uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  RETURN (
    WITH pagamentos AS (
      SELECT
        to_char(COALESCE(data_pagamento, data_vencimento)::date, 'YYYY-MM') AS month_key,
        sum(valor) AS total_pagamentos
      FROM expenses
      WHERE status = 'paga'
        AND COALESCE(data_pagamento, data_vencimento) >= p_start_date
        AND COALESCE(data_pagamento, data_vencimento) <= p_end_date
        AND (p_branch_ids IS NULL OR branch_id = ANY(p_branch_ids))
      GROUP BY to_char(COALESCE(data_pagamento, data_vencimento)::date, 'YYYY-MM')
    ),
    recebimentos AS (
      SELECT
        to_char(data_vencimento::date, 'YYYY-MM') AS month_key,
        sum(valor) AS total_recebimentos
      FROM invoices
      WHERE status = 'paga'
        AND data_vencimento >= p_start_date
        AND data_vencimento <= p_end_date
        AND (p_branch_ids IS NULL OR branch_id = ANY(p_branch_ids))
      GROUP BY to_char(data_vencimento::date, 'YYYY-MM')
    ),
    months AS (
      SELECT DISTINCT month_key FROM pagamentos
      UNION
      SELECT DISTINCT month_key FROM recebimentos
    ),
    summary AS (
      SELECT
        m.month_key as "month",
        COALESCE(r.total_recebimentos, 0) AS recebimentos,
        COALESCE(p.total_pagamentos, 0) AS pagamentos,
        COALESCE(r.total_recebimentos, 0) - COALESCE(p.total_pagamentos, 0) AS fluxo
      FROM months m
      LEFT JOIN pagamentos p ON p.month_key = m.month_key
      LEFT JOIN recebimentos r ON r.month_key = m.month_key
      ORDER BY m.month_key
    )
    SELECT jsonb_build_object(
      'data', COALESCE((SELECT jsonb_agg(row_to_json(s)) FROM summary s), '[]'::jsonb),
      'totais', jsonb_build_object(
        'recebimentos', COALESCE((SELECT sum(recebimentos) FROM summary), 0),
        'pagamentos', COALESCE((SELECT sum(pagamentos) FROM summary), 0),
        'saldo', COALESCE((SELECT sum(fluxo) FROM summary), 0)
      )
    )
  );
END;
$function$;

-- ===== get_cost_center_summary =====
CREATE OR REPLACE FUNCTION public.get_cost_center_summary(p_start_date date, p_end_date date, p_branch_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  RETURN (
    WITH raw_expenses AS (
      SELECT 
        COALESCE(centro_custo, 'Sem centro de custo') as cc,
        SUM(valor) as exp_total,
        SUM(CASE WHEN status = 'paga' THEN valor ELSE 0 END) as exp_baixado,
        SUM(CASE WHEN data_vencimento < CURRENT_DATE AND status = 'pendente' THEN valor ELSE 0 END) as exp_vencido,
        SUM(CASE WHEN data_vencimento >= CURRENT_DATE AND status = 'pendente' THEN valor ELSE 0 END) as exp_em_aberto
      FROM expenses
      WHERE data_vencimento >= p_start_date AND data_vencimento <= p_end_date
        AND (p_branch_id IS NULL OR branch_id = p_branch_id)
      GROUP BY COALESCE(centro_custo, 'Sem centro de custo')
    ),
    raw_invoices AS (
      SELECT 
        COALESCE(b.centro_custo, 'Sem centro de custo') as cc,
        SUM(i.valor) as inv_total,
        SUM(CASE WHEN i.status = 'paga' THEN i.valor ELSE 0 END) as inv_baixado,
        SUM(CASE WHEN i.data_vencimento < CURRENT_DATE AND i.status NOT IN ('paga', 'cancelada') THEN i.valor ELSE 0 END) as inv_vencido,
        SUM(CASE WHEN i.data_vencimento >= CURRENT_DATE AND i.status NOT IN ('paga', 'cancelada') THEN i.valor ELSE 0 END) as inv_em_aberto
      FROM invoices i
      LEFT JOIN billing_contacts b ON b.id = i.billing_contact_id
      WHERE i.data_vencimento >= p_start_date AND i.data_vencimento <= p_end_date
        AND (p_branch_id IS NULL OR i.branch_id = p_branch_id)
      GROUP BY COALESCE(b.centro_custo, 'Sem centro de custo')
    ),
    all_ccs AS (
      SELECT cc FROM raw_expenses UNION SELECT cc FROM raw_invoices
    )
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'centroCusto', c.cc,
        'valorTotal', COALESCE(e.exp_total, 0) + COALESCE(i.inv_total, 0),
        'emAberto', COALESCE(e.exp_em_aberto, 0) + COALESCE(i.inv_em_aberto, 0),
        'vencido', COALESCE(e.exp_vencido, 0) + COALESCE(i.inv_vencido, 0),
        'baixado', COALESCE(e.exp_baixado, 0) + COALESCE(i.inv_baixado, 0)
      )
      ORDER BY (COALESCE(e.exp_total, 0) + COALESCE(i.inv_total, 0)) DESC
    ), '[]'::jsonb)
    FROM all_ccs c
    LEFT JOIN raw_expenses e ON e.cc = c.cc
    LEFT JOIN raw_invoices i ON i.cc = c.cc
  );
END;
$function$;

-- ===== get_treasury_summary =====
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
      'month', to_char(data_movimentacao, 'YYYY-MM'),
      'entradas', SUM(CASE WHEN tipo = 'entrada' THEN valor ELSE 0 END),
      'saidas', SUM(CASE WHEN tipo IN ('saida', 'transferencia') THEN valor ELSE 0 END)
    ) ORDER BY to_char(data_movimentacao, 'YYYY-MM')
  ) INTO v_monthly
  FROM treasury_entries
  WHERE data_movimentacao >= p_start_date AND data_movimentacao <= p_end_date
  GROUP BY to_char(data_movimentacao, 'YYYY-MM');

  RETURN json_build_object(
    'accounts', COALESCE(v_accounts, '[]'::json),
    'monthlyData', COALESCE(v_monthly, '[]'::json)
  );
END;
$function$;