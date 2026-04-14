-- ============================================================
-- Migration: RPC Produtividade Optimized
-- Consolida o cálculo de produtividade (pesos/bônus cruzando 
-- area_goals e activity_types) e os ultimos 6 meses no backend.
-- ============================================================

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
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_start date := date_trunc('month', p_month);
  v_end date := (date_trunc('month', p_month) + interval '1 month' - interval '1 day')::date;
  v_bypass_filters boolean := false;
  v_is_coord boolean := false;
  v_my_profile_id uuid;
  v_coord_profile_id uuid;
  v_allowed_user_ids uuid[];
  
  v_rows jsonb;
  v_history jsonb := '[]'::jsonb;
  
  i int;
  m_date date;
  m_start date;
  m_end date;
  m_total float;
  m_count int;
  m_avg float;
BEGIN
  -- Definir scope de permissões
  IF p_user_id IS NOT NULL THEN
    IF public.has_role(p_user_id, 'admin') OR public.has_role(p_user_id, 'socio') OR public.has_role(p_user_id, 'gerente') THEN
      v_bypass_filters := true;
    ELSIF public.has_role(p_user_id, 'coordenador') THEN
      v_is_coord := true;
    END IF;

    IF NOT v_bypass_filters THEN
      SELECT id INTO v_my_profile_id FROM profiles WHERE user_id = p_user_id LIMIT 1;
      IF v_is_coord AND v_my_profile_id IS NOT NULL THEN
        SELECT array_agg(user_id) INTO v_allowed_user_ids FROM profiles WHERE reports_to = v_my_profile_id;
        IF v_allowed_user_ids IS NULL THEN v_allowed_user_ids := ARRAY[p_user_id]; ELSE v_allowed_user_ids := array_append(v_allowed_user_ids, p_user_id); END IF;
      ELSE
        v_allowed_user_ids := ARRAY[p_user_id];
      END IF;
    END IF;
  END IF;

  -- Filter coordinator ID if provided
  IF p_coordinator_id IS NOT NULL THEN
    SELECT id INTO v_coord_profile_id FROM profiles WHERE user_id = p_coordinator_id LIMIT 1;
  END IF;

  -- Computar os ROWS do mês requisitado
  WITH base_profiles AS (
    SELECT user_id, full_name, area, reports_to, id
    FROM profiles
    WHERE is_active = true
      AND (p_area IS NULL OR area = p_area)
      AND (p_collaborator_id IS NULL OR user_id = p_collaborator_id)
      AND (p_coordinator_id IS NULL OR user_id = p_coordinator_id OR reports_to = v_coord_profile_id)
      AND (v_bypass_filters = true OR user_id = ANY(v_allowed_user_ids))
  ),
  entries AS (
    SELECT e.user_id, e.quantidade, at.weight, e.process_id
    FROM timesheet_entries e
    LEFT JOIN activity_types at ON at.id = e.activity_type_id
    WHERE e.data_atividade >= v_start AND e.data_atividade <= v_end
      AND e.user_id IN (SELECT user_id FROM base_profiles)
  ),
  filtered_entries AS (
    SELECT * FROM entries e
    WHERE (p_client_id IS NULL OR EXISTS (SELECT 1 FROM processes p WHERE p.id = e.process_id AND p.id_cliente = p_client_id))
  ),
  user_stats AS (
    SELECT 
      user_id, 
      sum(quantidade * COALESCE(weight, 0)) as total_weighted
    FROM filtered_entries
    GROUP BY user_id
  ),
  goals AS (
    SELECT area, monthly_goal, extra_value_per_calculation
    FROM area_goals
  )
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'user_id', bp.user_id,
      'full_name', bp.full_name,
      'area', bp.area,
      'total_weighted', COALESCE(us.total_weighted, 0),
      'monthly_goal', COALESCE(g.monthly_goal, 0),
      'percentage', CASE WHEN COALESCE(g.monthly_goal, 0) > 0 THEN (COALESCE(us.total_weighted, 0) / g.monthly_goal) * 100 ELSE 0 END,
      'bonus_projected', CASE WHEN COALESCE(us.total_weighted, 0) > COALESCE(g.monthly_goal, 0) THEN (us.total_weighted - g.monthly_goal) * COALESCE(g.extra_value_per_calculation, 0) ELSE 0 END
    ) ORDER BY (CASE WHEN COALESCE(g.monthly_goal, 0) > 0 THEN (COALESCE(us.total_weighted, 0) / g.monthly_goal) * 100 ELSE 0 END) DESC
  ), '[]'::jsonb)
  INTO v_rows
  FROM base_profiles bp
  LEFT JOIN user_stats us ON us.user_id = bp.user_id
  LEFT JOIN goals g ON g.area = bp.area;

  -- Computar HISTORY (6 meses backward limitando scope)
  FOR i IN REVERSE 5..0 LOOP
    m_date := p_month - (i || ' month')::interval;
    m_start := date_trunc('month', m_date);
    m_end := (date_trunc('month', m_date) + interval '1 month' - interval '1 day')::date;
    
    WITH hist_entries AS (
      SELECT e.user_id, e.quantidade, at.weight
      FROM timesheet_entries e
      LEFT JOIN activity_types at ON at.id = e.activity_type_id
      WHERE e.data_atividade >= m_start AND e.data_atividade <= m_end
        AND e.user_id IN (
          SELECT user_id FROM profiles
          WHERE is_active = true
            AND (p_area IS NULL OR area = p_area)
            AND (p_collaborator_id IS NULL OR user_id = p_collaborator_id)
            AND (p_coordinator_id IS NULL OR user_id = p_coordinator_id OR reports_to = v_coord_profile_id)
            AND (v_bypass_filters = true OR user_id = ANY(v_allowed_user_ids))
        )
    ),
    hist_stats AS (
      SELECT he.user_id, sum(he.quantidade * COALESCE(he.weight, 0)) as total_w, p.area
      FROM hist_entries he
      JOIN profiles p ON p.user_id = he.user_id
      GROUP BY he.user_id, p.area
    ),
    hist_pct AS (
      SELECT 
        (hs.total_w / g.monthly_goal) * 100 as pct
      FROM hist_stats hs
      JOIN area_goals g ON g.area = hs.area
      WHERE COALESCE(g.monthly_goal, 0) > 0
    )
    SELECT COALESCE(sum(pct), 0), count(*)
    INTO m_total, m_count
    FROM hist_pct;
    
    m_avg := 0;
    IF m_count > 0 THEN
      m_avg := m_total / m_count;
    END IF;
    
    v_history := v_history || jsonb_build_object(
      'month', to_char(m_date, 'Mon/YY'),
      'avg', m_avg
    );
  END LOOP;

  RETURN jsonb_build_object(
    'rows', COALESCE(v_rows, '[]'::jsonb),
    'history', COALESCE(v_history, '[]'::jsonb)
  );
END;
$$;
