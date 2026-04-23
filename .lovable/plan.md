

## Otimizar `get_produtividade_report` e adicionar índice em `user_roles`

### Objetivo

1. Adicionar índice composto `(user_id, role)` em `public.user_roles` para acelerar as funções `has_role`, `is_leader_or_above`, `is_financeiro`, etc., chamadas em quase toda RLS.
2. Reescrever a função RPC `get_produtividade_report` substituindo o loop `FOR i IN REVERSE 5..0` (6 queries sequenciais) por **uma única agregação** com `GROUP BY date_trunc('month', e.data_atividade)`, gerando os 6 meses via `generate_series` para garantir meses zerados.

### Mudanças

**Migração única** via tool `supabase--migration` (nome sugerido: `optimize_produtividade_report_and_user_roles_index`):

```sql
-- 1. Índice composto para acelerar lookups de papel por usuário
CREATE INDEX IF NOT EXISTS idx_user_roles_user_role
  ON public.user_roles (user_id, role);

-- 2. Reescrever get_produtividade_report
CREATE OR REPLACE FUNCTION public.get_produtividade_report(
  p_month date,
  p_area text DEFAULT NULL,
  p_collaborator_id uuid DEFAULT NULL,
  p_client_id uuid DEFAULT NULL,
  p_coordinator_id uuid DEFAULT NULL,
  p_user_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_month_start date := date_trunc('month', p_month)::date;
  v_history_start date := (date_trunc('month', p_month) - interval '5 months')::date;
  v_rows jsonb;
  v_history jsonb;
BEGIN
  -- (a) Linhas do mês corrente: mesma lógica de hoje (resumida)
  --     Mantém os filtros existentes: area, collaborator, client, coordinator, scope por p_user_id.
  WITH base AS (
    SELECT
      p.user_id,
      pr.full_name,
      pr.area,
      SUM(COALESCE(at.weight, 1) * e.quantidade) AS total_weighted,
      COALESCE(ag.monthly_goal, 0) AS monthly_goal,
      COALESCE(ag.extra_value_per_calculation, 0) AS extra_value
    FROM timesheet_entries e
    JOIN profiles p ON p.user_id = e.user_id
    LEFT JOIN profiles pr ON pr.user_id = e.user_id
    LEFT JOIN activity_types at ON at.id = e.activity_type_id
    LEFT JOIN area_goals ag ON ag.area = pr.area
    WHERE e.data_atividade >= v_month_start
      AND e.data_atividade <  (v_month_start + interval '1 month')
      AND (p_area IS NULL OR pr.area::text = p_area)
      AND (p_collaborator_id IS NULL OR e.user_id = p_collaborator_id)
      AND (p_client_id IS NULL OR e.client_id = p_client_id)
      AND (p_coordinator_id IS NULL OR pr.reports_to = (
        SELECT id FROM profiles WHERE user_id = p_coordinator_id
      ))
    GROUP BY p.user_id, pr.full_name, pr.area, ag.monthly_goal, ag.extra_value_per_calculation
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'user_id', user_id,
    'full_name', full_name,
    'area', area,
    'total_weighted', total_weighted,
    'monthly_goal', monthly_goal,
    'percentage', CASE WHEN monthly_goal > 0 THEN ROUND((total_weighted / monthly_goal) * 100, 2) ELSE 0 END,
    'bonus_projected', GREATEST(total_weighted - monthly_goal, 0) * extra_value
  )), '[]'::jsonb) INTO v_rows FROM base;

  -- (b) Histórico de 6 meses em UMA query agregada
  WITH months AS (
    SELECT generate_series(v_history_start, v_month_start, interval '1 month')::date AS m
  ),
  agg AS (
    SELECT
      date_trunc('month', e.data_atividade)::date AS m,
      SUM(COALESCE(at.weight, 1) * e.quantidade) AS total_weighted
    FROM timesheet_entries e
    LEFT JOIN profiles pr ON pr.user_id = e.user_id
    LEFT JOIN activity_types at ON at.id = e.activity_type_id
    WHERE e.data_atividade >= v_history_start
      AND e.data_atividade <  (v_month_start + interval '1 month')
      AND (p_area IS NULL OR pr.area::text = p_area)
      AND (p_collaborator_id IS NULL OR e.user_id = p_collaborator_id)
      AND (p_client_id IS NULL OR e.client_id = p_client_id)
      AND (p_coordinator_id IS NULL OR pr.reports_to = (
        SELECT id FROM profiles WHERE user_id = p_coordinator_id
      ))
    GROUP BY 1
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'month', to_char(months.m, 'MM/YY'),
    'total_weighted', COALESCE(agg.total_weighted, 0)
  ) ORDER BY months.m), '[]'::jsonb)
  INTO v_history
  FROM months
  LEFT JOIN agg ON agg.m = months.m;

  RETURN jsonb_build_object('rows', v_rows, 'history', v_history);
END;
$$;
```

### Detalhes técnicos

- **Índice `(user_id, role)`**: as funções `has_role(uid, 'admin')` filtram por ambas as colunas; índice composto serve `WHERE user_id = ? AND role = ?` e também `WHERE user_id = ?`. `IF NOT EXISTS` evita falha se já criado antes.
- **`generate_series` + `LEFT JOIN`**: garante 6 buckets mensais mesmo quando algum mês não tem lançamento (mantém comportamento do loop original que fazia 1 query por mês e exibia 0 quando vazio).
- **Filtros consistentes**: o histórico aplica os **mesmos filtros** do mês corrente (`p_area`, `p_collaborator_id`, `p_client_id`, `p_coordinator_id`) — comportamento que o consumer (`useProdutividadeReport`) já espera.
- **`p_user_id`**: parâmetro mantido na assinatura para compat com o frontend, mas só é usado se a versão atual da função aplicar filtro por escopo (verificarei o corpo atual antes de remover/manter — preservando o comportamento). Na implementação, se a função atual filtra por escopo do usuário (ex.: usuário comum vê só a si mesmo), essa cláusula será mantida igual.
- **`SECURITY DEFINER` + `SET search_path = public`**: preservado conforme padrão do projeto (ver `mem://security/rls-recursion-prevention`).
- **Performance esperada**: histórico cai de 6 round-trips para 1; combinado com mês corrente, função passa de ~7 queries para 2.
- **Backward compat**: shape do retorno (`{ rows, history }`) **inalterado**. `history[i]` continua tendo `{ month: 'MM/YY', total_weighted: number }`. Frontend (`useReportData.ts → useProdutividadeReport`) não muda.
- **Antes de escrever a migração**, leio a definição atual de `get_produtividade_report` no banco (via `supabase--read_query` em `pg_proc`) para garantir que filtros e escopo de `p_user_id` sejam preservados fielmente — qualquer divergência será incluída na migração final.

### Arquivos afetados

- Nova migração em `supabase/migrations/<timestamp>_optimize_produtividade_report_and_user_roles_index.sql`.
- **Nenhum arquivo TS/TSX alterado** — `useReportData.ts` continua chamando `supabase.rpc('get_produtividade_report', {...})` com mesmos parâmetros.

### Fora do escopo

- Otimizar `get_prazos_summary` / `get_prazos_rows` (mesmo padrão poderia se aplicar, mas não foi pedido).
- Criar índices adicionais em `timesheet_entries(data_atividade)` ou `(user_id, data_atividade)` — pode ser próxima iteração se profiling mostrar necessidade.
- Materialized view para histórico — overkill nesta fase.

