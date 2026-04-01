
CREATE OR REPLACE FUNCTION public.assign_calculation(p_solicitacao_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id uuid;
  v_calc_type_id uuid;
  v_assigned uuid;
BEGIN
  SELECT client_id, calculation_type_id
    INTO v_client_id, v_calc_type_id
    FROM solicitacoes
   WHERE id = p_solicitacao_id;

  -- 1. Profissional com histórico no mesmo cliente, MENOR CARGA ATUAL
  IF v_client_id IS NOT NULL THEN
    SELECT s.assigned_to INTO v_assigned
      FROM solicitacoes s
      JOIN profiles p ON p.user_id = s.assigned_to AND p.is_active = true
     WHERE s.client_id = v_client_id
       AND s.assigned_to IS NOT NULL
       AND s.id != p_solicitacao_id
     GROUP BY s.assigned_to
     HAVING COUNT(*) >= 2
     ORDER BY (
       SELECT COUNT(*) FROM solicitacoes sub
        WHERE sub.assigned_to = s.assigned_to
          AND sub.status IN ('pendente', 'em_andamento')
     ) ASC
     LIMIT 1;

    IF v_assigned IS NOT NULL THEN
      UPDATE solicitacoes SET assigned_to = v_assigned, updated_at = now()
       WHERE id = p_solicitacao_id;
      RETURN v_assigned;
    END IF;
  END IF;

  -- 2. Profissional com histórico no mesmo tipo de cálculo, MENOR CARGA ATUAL
  IF v_calc_type_id IS NOT NULL THEN
    SELECT s.assigned_to INTO v_assigned
      FROM solicitacoes s
      JOIN profiles p ON p.user_id = s.assigned_to AND p.is_active = true
     WHERE s.calculation_type_id = v_calc_type_id
       AND s.assigned_to IS NOT NULL
       AND s.id != p_solicitacao_id
     GROUP BY s.assigned_to
     HAVING COUNT(*) >= 2
     ORDER BY (
       SELECT COUNT(*) FROM solicitacoes sub
        WHERE sub.assigned_to = s.assigned_to
          AND sub.status IN ('pendente', 'em_andamento')
     ) ASC
     LIMIT 1;

    IF v_assigned IS NOT NULL THEN
      UPDATE solicitacoes SET assigned_to = v_assigned, updated_at = now()
       WHERE id = p_solicitacao_id;
      RETURN v_assigned;
    END IF;
  END IF;

  -- 3. Coordenador da equipe vinculada ao cliente (via team_clients)
  IF v_client_id IS NOT NULL THEN
    SELECT p.user_id INTO v_assigned
      FROM team_clients tc
      JOIN profiles p ON p.id = tc.team_lead_id AND p.is_active = true
     WHERE tc.client_id = v_client_id
     LIMIT 1;

    IF v_assigned IS NOT NULL THEN
      UPDATE solicitacoes SET assigned_to = v_assigned, updated_at = now()
       WHERE id = p_solicitacao_id;
      RETURN v_assigned;
    END IF;
  END IF;

  -- 4. Balanceamento por carga entre calculistas de áreas operacionais
  SELECT p.user_id INTO v_assigned
    FROM profiles p
    JOIN user_roles ur ON ur.user_id = p.user_id AND ur.role IN ('calculista', 'assistente', 'lider')
   WHERE p.is_active = true
     AND p.area IN ('execucao', 'contingencia', 'acoes_coletivas', 'civel', 'laudos')
   ORDER BY (
     SELECT COALESCE(SUM(ct.estimated_complexity), 0)
       FROM solicitacoes s
       LEFT JOIN calculation_types ct ON ct.id = s.calculation_type_id
      WHERE s.assigned_to = p.user_id
        AND s.status IN ('pendente', 'em_andamento')
   ) ASC
   LIMIT 1;

  IF v_assigned IS NOT NULL THEN
    UPDATE solicitacoes SET assigned_to = v_assigned, updated_at = now()
     WHERE id = p_solicitacao_id;
  END IF;

  RETURN v_assigned;
END;
$$;
