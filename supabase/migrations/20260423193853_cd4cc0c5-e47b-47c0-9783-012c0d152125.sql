-- 1. Composite index to speed up role lookups (has_role, is_*)
CREATE INDEX IF NOT EXISTS idx_user_roles_user_role
  ON public.user_roles (user_id, role);

-- 2. Rewrite get_produtividade_report: replace 6 sequential month queries with a single aggregation
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
  v_month_end   date := (date_trunc('month', p_month) + interval '1 month' - interval '1 day')::date;
  v_history_start date := (date_trunc('month', p_month) - interval '5 months')::date;

  v_bypass_filters boolean := false;
  v_is_coord boolean := false;
  v_my_profile_id uuid;
  v_coord_profile_id uuid;
  v_allowed_user_ids uuid[];

  v_rows jsonb;
  v_history jsonb;
BEGIN
  -- Permission scope (same logic as previous version)
  IF p_user_id IS NOT NULL THEN
    IF public.has_role(p_user_id, 'admin')
       OR public.has_role(p_user_id, 'socio')
       OR public.has_role(p_user_id, 'gerente') THEN
      v_bypass_filters := true;
    ELSIF public.has_role(p_user_id, 'coordenador') THEN
      v_is_coord := true;
    END IF;

    IF NOT v_bypass_filters THEN
      SELECT id INTO v_my_profile_id FROM profiles WHERE user_id = p_user_id LIMIT 1;
      IF v_is_coord AND v_my_profile_id IS NOT NULL THEN
        SELECT array_agg(user_id) INTO v_allowed_user_ids
        FROM profiles WHERE reports_to = v_my_profile_id;
        IF v_allowed_user_ids IS NULL THEN
          v_allowed_user_ids := ARRAY[p_user_id];
        ELSE
          v_allowed_user_ids := array_append(v_allowed_user_ids, p_user_id);
        END IF;
      ELSE
        v_allowed_user_ids := ARRAY[p_user_id];
      END IF;
    END IF;
  END IF;

  -- Coordinator filter: resolve profile id once
  IF p_coordinator_id IS NOT NULL THEN
    SELECT id INTO v_coord_profile_id FROM profiles WHERE user_id = p_coordinator_id LIMIT 1;
  END IF;

  -- (a) Current month rows
  WITH base_profiles AS (
    SELECT user_id, full_name, area, reports_to
    FROM profiles
    WHERE is_active = true
      AND (p_area IS NULL OR area::text = p_area)
      AND (p_collaborator_id IS NULL OR user_id = p_collaborator_id)
      AND (p_coordinator_id IS NULL OR user_id = p_coordinator_id OR reports_to = v_coord_profile_id)
      AND (v_bypass_filters = true OR v_allowed_user_ids IS NULL OR user_id = ANY(v_allowed_user_ids))
  ),
  entries AS (
    SELECT e.user_id, e.quantidade, at.weight, e.process_id
    FROM timesheet_entries e
    LEFT JOIN activity_types at ON at.id = e.activity_type_id
    WHERE e.data_atividade >= v_month_start
      AND e.data_atividade <= v_month_end
      AND e.user_id IN (SELECT user_id FROM base_profiles)
  ),
  filtered_entries AS (
    SELECT * FROM entries e
    WHERE p_client_id IS NULL
       OR EXISTS (SELECT 1 FROM processes p WHERE p.id = e.process_id AND p.id_cliente = p_client_id)
  ),
  user_stats AS (
    SELECT user_id, SUM(quantidade * COALESCE(weight, 0)) AS total_weighted
    FROM filtered_entries
    GROUP BY user_id
  )
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'user_id', bp.user_id,
      'full_name', bp.full_name,
      'area', bp.area,
      'total_weighted', COALESCE(us.total_weighted, 0),
      'monthly_goal', COALESCE(g.monthly_goal, 0),
      'percentage', CASE WHEN COALESCE(g.monthly_goal, 0) > 0
                         THEN (COALESCE(us.total_weighted, 0) / g.monthly_goal) * 100
                         ELSE 0 END,
      'bonus_projected', CASE WHEN COALESCE(us.total_weighted, 0) > COALESCE(g.monthly_goal, 0)
                              THEN (us.total_weighted - g.monthly_goal) * COALESCE(g.extra_value_per_calculation, 0)
                              ELSE 0 END
    ) ORDER BY (CASE WHEN COALESCE(g.monthly_goal, 0) > 0
                     THEN (COALESCE(us.total_weighted, 0) / g.monthly_goal) * 100
                     ELSE 0 END) DESC
  ), '[]'::jsonb)
  INTO v_rows
  FROM base_profiles bp
  LEFT JOIN user_stats us ON us.user_id = bp.user_id
  LEFT JOIN area_goals g ON g.area = bp.area;

  -- (b) 6-month history in ONE aggregated query
  WITH months AS (
    SELECT generate_series(v_history_start, v_month_start, interval '1 month')::date AS m
  ),
  scoped_profiles AS (
    SELECT user_id, area
    FROM profiles
    WHERE is_active = true
      AND (p_area IS NULL OR area::text = p_area)
      AND (p_collaborator_id IS NULL OR user_id = p_collaborator_id)
      AND (p_coordinator_id IS NULL OR user_id = p_coordinator_id OR reports_to = v_coord_profile_id)
      AND (v_bypass_filters = true OR v_allowed_user_ids IS NULL OR user_id = ANY(v_allowed_user_ids))
  ),
  hist_entries AS (
    SELECT
      date_trunc('month', e.data_atividade)::date AS m,
      sp.area,
      e.user_id,
      e.quantidade * COALESCE(at.weight, 0) AS weighted
    FROM timesheet_entries e
    JOIN scoped_profiles sp ON sp.user_id = e.user_id
    LEFT JOIN activity_types at ON at.id = e.activity_type_id
    WHERE e.data_atividade >= v_history_start
      AND e.data_atividade <  (v_month_start + interval '1 month')
      AND (p_client_id IS NULL OR EXISTS (
        SELECT 1 FROM processes p WHERE p.id = e.process_id AND p.id_cliente = p_client_id
      ))
  ),
  per_user_month AS (
    SELECT he.m, he.user_id, he.area, SUM(he.weighted) AS total_w
    FROM hist_entries he
    GROUP BY he.m, he.user_id, he.area
  ),
  per_user_pct AS (
    SELECT pum.m,
           CASE WHEN COALESCE(g.monthly_goal, 0) > 0
                THEN (pum.total_w / g.monthly_goal) * 100
                ELSE 0 END AS pct
    FROM per_user_month pum
    LEFT JOIN area_goals g ON g.area = pum.area
    WHERE COALESCE(g.monthly_goal, 0) > 0
  ),
  agg AS (
    SELECT m, AVG(pct)::float AS avg_pct
    FROM per_user_pct
    GROUP BY m
  )
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'month', to_char(months.m, 'Mon/YY'),
      'avg', COALESCE(agg.avg_pct, 0)
    ) ORDER BY months.m
  ), '[]'::jsonb)
  INTO v_history
  FROM months
  LEFT JOIN agg ON agg.m = months.m;

  RETURN jsonb_build_object(
    'rows', COALESCE(v_rows, '[]'::jsonb),
    'history', COALESCE(v_history, '[]'::jsonb)
  );
END;
$$;