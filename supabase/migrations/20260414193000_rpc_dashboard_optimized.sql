-- ============================================================
-- Migration: RPC Dashboard Optimized
-- Consolida as contagens e agregações do dashboard que antes
-- exigiam ~10 requisições simultâneas e causavam travamentos.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_dashboard_stats(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_bypass_filters boolean := false;
  v_is_coord boolean := false;
  v_my_profile_id uuid;
  v_team_user_ids uuid[];
  
  -- metricas
  v_active_clients int;
  v_pf_count int;
  v_pj_count int;
  v_c30 int;
  v_c60 int;
  v_c90 int;
  
  v_pending_deadlines int;
  v_overdue_deadlines int;
  
  v_deadlines_by_user jsonb;
  v_team_members int := 0;
  
  v_today date := current_date;
  v_in30 date := current_date + 30;
  v_in60 date := current_date + 60;
  v_in90 date := current_date + 90;
BEGIN
  -- Definir filtros de equipe com base nas permissões
  IF public.has_role(p_user_id, 'admin') OR public.has_role(p_user_id, 'socio') OR public.has_role(p_user_id, 'gerente') THEN
    v_bypass_filters := true;
  ELSIF public.has_role(p_user_id, 'coordenador') THEN
    v_is_coord := true;
  END IF;

  IF NOT v_bypass_filters AND v_is_coord THEN
    SELECT id INTO v_my_profile_id FROM profiles WHERE user_id = p_user_id LIMIT 1;
    IF v_my_profile_id IS NOT NULL THEN
      SELECT array_agg(user_id) INTO v_team_user_ids FROM profiles WHERE reports_to = v_my_profile_id;
      IF v_team_user_ids IS NULL THEN
        v_team_user_ids := ARRAY[p_user_id];
      ELSE
        v_team_user_ids := array_append(v_team_user_ids, p_user_id);
      END IF;
    END IF;
  END IF;

  -- Agg de Clientes
  SELECT count(*) INTO v_active_clients FROM clients WHERE is_active = true;
  SELECT count(*) INTO v_pf_count FROM clients WHERE is_active = true AND tipo = 'fisica';
  SELECT count(*) INTO v_pj_count FROM clients WHERE is_active = true AND tipo = 'juridica';

  -- Agg de Contratos
  SELECT count(*) INTO v_c30 FROM clients WHERE is_active = true AND contrato_data_vencimento >= v_today AND contrato_data_vencimento <= v_in30;
  SELECT count(*) INTO v_c60 FROM clients WHERE is_active = true AND contrato_data_vencimento >= v_today AND contrato_data_vencimento <= v_in60;
  SELECT count(*) INTO v_c90 FROM clients WHERE is_active = true AND contrato_data_vencimento >= v_today AND contrato_data_vencimento <= v_in90;

  -- Agregação global de Deadlines do escopo permitido
  WITH base_deadlines AS (
    SELECT pd.assigned_to, pd.data_prazo
    FROM process_deadlines pd
    INNER JOIN processes p ON p.id = pd.process_id
    WHERE pd.is_completed = false
      AND (
        v_bypass_filters = true 
        OR (v_team_user_ids IS NOT NULL AND pd.assigned_to = ANY(v_team_user_ids))
        OR (v_team_user_ids IS NULL AND pd.assigned_to = p_user_id)
      )
  ),
  aggregated AS (
    SELECT 
      assigned_to,
      count(*) FILTER (WHERE data_prazo >= v_today) as pending,
      count(*) FILTER (WHERE data_prazo < v_today) as overdue
    FROM base_deadlines
    WHERE assigned_to IS NOT NULL
    GROUP BY assigned_to
  )
  SELECT 
    COALESCE(sum(pending), 0),
    COALESCE(sum(overdue), 0),
    COUNT(assigned_to)
  INTO v_pending_deadlines, v_overdue_deadlines, v_team_members
  FROM aggregated;

  -- Lista de Prazos por Usuario
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'user_name', COALESCE(pr.full_name, 'Desconhecido'),
        'pending', a.pending,
        'overdue', a.overdue
      ) ORDER BY a.overdue DESC, a.pending DESC
    ),
    '[]'::jsonb
  ) INTO v_deadlines_by_user
  FROM (
    SELECT assigned_to, count(*) FILTER (WHERE data_prazo >= v_today) as pending, count(*) FILTER (WHERE data_prazo < v_today) as overdue
    FROM process_deadlines pd
    INNER JOIN processes p ON p.id = pd.process_id
    WHERE pd.is_completed = false AND pd.assigned_to IS NOT NULL
      AND (
        v_bypass_filters = true 
        OR (v_team_user_ids IS NOT NULL AND pd.assigned_to = ANY(v_team_user_ids))
        OR (v_team_user_ids IS NULL AND pd.assigned_to = p_user_id)
      )
    GROUP BY assigned_to
  ) a
  LEFT JOIN profiles pr ON pr.user_id = a.assigned_to;

  RETURN jsonb_build_object(
    'activeClients', COALESCE(v_active_clients, 0),
    'clientsByType', jsonb_build_object('fisica', COALESCE(v_pf_count, 0), 'juridica', COALESCE(v_pj_count, 0)),
    'contractsExpiring30', COALESCE(v_c30, 0),
    'contractsExpiring60', COALESCE(v_c60, 0),
    'contractsExpiring90', COALESCE(v_c90, 0),
    'pendingDeadlines', COALESCE(v_pending_deadlines, 0),
    'overdueDeadlines', COALESCE(v_overdue_deadlines, 0),
    'teamMembers', COALESCE(v_team_members, 0),
    'teamPendingDeadlines', COALESCE(v_pending_deadlines, 0),
    'teamOverdueDeadlines', COALESCE(v_overdue_deadlines, 0),
    'deadlinesByUser', v_deadlines_by_user,
    'totalProcesses', 0,
    'teamMonthlyActivities', 0
  );
END;
$$;
