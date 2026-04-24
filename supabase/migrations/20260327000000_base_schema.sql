


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "postgres";


CREATE TYPE "public"."agent_execution_status" AS ENUM (
    'running',
    'completed',
    'failed'
);


ALTER TYPE "public"."agent_execution_status" OWNER TO "postgres";


CREATE TYPE "public"."app_role" AS ENUM (
    'admin',
    'gerente',
    'lider',
    'calculista',
    'financeiro',
    'socio',
    'coordenador',
    'usuario',
    'advogado',
    'assistente',
    'consultor',
    'assistente_financeiro',
    'convidado'
);


ALTER TYPE "public"."app_role" OWNER TO "postgres";


CREATE TYPE "public"."area_processo" AS ENUM (
    'trabalhista',
    'civel'
);


ALTER TYPE "public"."area_processo" OWNER TO "postgres";


CREATE TYPE "public"."area_setor" AS ENUM (
    'execucao',
    'contingencia',
    'decisao',
    'acoes_coletivas',
    'administrativo',
    'rh',
    'financeiro_area',
    'geral',
    'agendamento',
    'civel',
    'digitacao',
    'laudos'
);


ALTER TYPE "public"."area_setor" OWNER TO "postgres";


CREATE TYPE "public"."bonus_status" AS ENUM (
    'pending',
    'approved',
    'paid',
    'cancelled'
);


ALTER TYPE "public"."bonus_status" OWNER TO "postgres";


CREATE TYPE "public"."event_type" AS ENUM (
    'prazo',
    'reuniao',
    'audiencia',
    'lembrete',
    'outro'
);


ALTER TYPE "public"."event_type" OWNER TO "postgres";


CREATE TYPE "public"."extraction_status" AS ENUM (
    'pending',
    'processing',
    'completed',
    'failed'
);


ALTER TYPE "public"."extraction_status" OWNER TO "postgres";


CREATE TYPE "public"."origem_solicitacao" AS ENUM (
    'email',
    'api',
    'manual',
    'email_sheet',
    'planilha_5_clientes',
    'planilha_pautas'
);


ALTER TYPE "public"."origem_solicitacao" OWNER TO "postgres";


CREATE TYPE "public"."pessoa_tipo" AS ENUM (
    'fisica',
    'juridica'
);


ALTER TYPE "public"."pessoa_tipo" OWNER TO "postgres";


CREATE TYPE "public"."prioridade_solicitacao" AS ENUM (
    'baixa',
    'media',
    'alta',
    'urgente'
);


ALTER TYPE "public"."prioridade_solicitacao" OWNER TO "postgres";


CREATE TYPE "public"."processed_file_status" AS ENUM (
    'pending',
    'processing',
    'completed',
    'failed',
    'skipped'
);


ALTER TYPE "public"."processed_file_status" OWNER TO "postgres";


CREATE TYPE "public"."status_solicitacao" AS ENUM (
    'pendente',
    'em_andamento',
    'concluida',
    'cancelada'
);


ALTER TYPE "public"."status_solicitacao" OWNER TO "postgres";


CREATE TYPE "public"."tipo_acao" AS ENUM (
    'individual',
    'coletiva'
);


ALTER TYPE "public"."tipo_acao" OWNER TO "postgres";


CREATE TYPE "public"."tipo_cadastro" AS ENUM (
    'cliente',
    'fornecedor'
);


ALTER TYPE "public"."tipo_cadastro" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."assign_calculation"("p_solicitacao_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."assign_calculation"("p_solicitacao_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_monthly_bonus"("p_month" "date") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_month_start DATE;
  v_month_end DATE;
  v_count INTEGER := 0;
  v_user RECORD;
  v_total_weighted NUMERIC;
  v_goal RECORD;
  v_excess NUMERIC;
  v_bonus NUMERIC;
BEGIN
  IF NOT public.is_admin_or_manager(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins and managers can calculate bonuses';
  END IF;

  v_month_start := date_trunc('month', p_month)::DATE;
  v_month_end := (date_trunc('month', p_month) + interval '1 month' - interval '1 day')::DATE;

  DELETE FROM bonus_calculations WHERE reference_month = v_month_start;

  FOR v_user IN
    SELECT DISTINCT te.user_id, p.area as user_area
    FROM timesheet_entries te
    JOIN profiles p ON p.user_id = te.user_id
    WHERE te.data_atividade BETWEEN v_month_start AND v_month_end
      AND te.activity_type_id IS NOT NULL
      AND p.area IS NOT NULL
  LOOP
    -- Deduplication: for entries with process_id, take max weight per process
    -- For entries without process_id, count all individually
    WITH with_process AS (
      SELECT DISTINCT ON (te.process_id)
        (te.quantidade * at2.weight) as best_weight
      FROM timesheet_entries te
      JOIN activity_types at2 ON at2.id = te.activity_type_id
      WHERE te.user_id = v_user.user_id
        AND te.data_atividade BETWEEN v_month_start AND v_month_end
        AND te.activity_type_id IS NOT NULL
        AND te.process_id IS NOT NULL
      ORDER BY te.process_id, (te.quantidade * at2.weight) DESC
    ),
    without_process AS (
      SELECT (te.quantidade * at2.weight) as best_weight
      FROM timesheet_entries te
      JOIN activity_types at2 ON at2.id = te.activity_type_id
      WHERE te.user_id = v_user.user_id
        AND te.data_atividade BETWEEN v_month_start AND v_month_end
        AND te.activity_type_id IS NOT NULL
        AND te.process_id IS NULL
    ),
    combined AS (
      SELECT best_weight FROM with_process
      UNION ALL
      SELECT best_weight FROM without_process
    )
    SELECT COALESCE(SUM(best_weight), 0) INTO v_total_weighted FROM combined;

    -- Get the user's area goal
    SELECT * INTO v_goal FROM area_goals WHERE area::text = v_user.user_area::text LIMIT 1;

    IF v_goal IS NULL THEN
      CONTINUE;
    END IF;

    v_excess := GREATEST(0, v_total_weighted - v_goal.monthly_goal);
    v_bonus := v_excess * COALESCE(v_goal.extra_value_per_calculation, 0);

    INSERT INTO bonus_calculations (
      user_id, area, reference_month, payment_month,
      monthly_goal, total_weighted, excess_count,
      extra_value, bonus_amount, status
    ) VALUES (
      v_user.user_id, v_user.user_area,
      v_month_start,
      (v_month_start + interval '4 months')::DATE,
      v_goal.monthly_goal, v_total_weighted, v_excess,
      COALESCE(v_goal.extra_value_per_calculation, 0), v_bonus, 'pending'
    );

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;


ALTER FUNCTION "public"."calculate_monthly_bonus"("p_month" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_monthly_provisions"("p_month" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_start_date DATE;
    v_end_date DATE;
    v_payout_date DATE;
    v_record RECORD;
    v_goal NUMERIC;
    v_total_weighted NUMERIC;
    v_total_value NUMERIC;
BEGIN
    -- Set date range for the month
    v_start_date := (p_month || '-01')::DATE;
    v_end_date := (v_start_date + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
    -- Payout date is +4 months from the start of the reference month
    v_payout_date := v_start_date + INTERVAL '4 months';

    -- 1. BILLING PROVISIONS (Grouped by Client/Month)
    -- We'll look at all approved entries for that month
    FOR v_record IN 
        SELECT 
            p.id_cliente,
            SUM(COALESCE(cp.valor, 0) * t.quantidade) as calc_value
        FROM public.timesheet_entries t
        JOIN public.processes p ON t.process_id = p.id
        LEFT JOIN public.contract_pricing cp ON p.id_cliente = cp.client_id
        WHERE t.data_atividade BETWEEN v_start_date AND v_end_date
          AND t.approved_at IS NOT NULL
        GROUP BY p.id_cliente
    LOOP
        INSERT INTO public.billing_provisions (client_id, month, status, total_value, updated_at)
        VALUES (v_record.id_cliente, p_month, 'pending', v_record.calc_value, now())
        ON CONFLICT (client_id, month) DO UPDATE 
        SET total_value = EXCLUDED.total_value, updated_at = now();
    END LOOP;

    -- 2. BONUS PROVISIONS (Grouped by User/Month)
    FOR v_record IN 
        SELECT 
            t.user_id,
            pr.area_setor,
            SUM(COALESCE(a.weight, 1.0) * t.quantidade) as total_weighted
        FROM public.timesheet_entries t
        JOIN public.activity_types a ON t.activity_type_id = a.id
        JOIN public.profiles pr ON t.user_id = pr.id
        WHERE t.data_atividade BETWEEN v_start_date AND v_end_date
          AND t.approved_at IS NOT NULL
        GROUP BY t.user_id, pr.area_setor
    LOOP
        -- Determine Goal based on area_setor
        CASE v_record.area_setor
            WHEN 'execucao' THEN v_goal := 100;
            WHEN 'contingencia' THEN v_goal := 140; -- As per user: 'Contingencia de Iniciais (meta 140)'
            WHEN 'decisao' THEN v_goal := 130;     -- As per user: 'Calculo de Decisao (Meta 130)'
            WHEN 'acoes_coletivas' THEN v_goal := 140;
            ELSE v_goal := 130; -- Default
        END CASE;

        v_total_weighted := v_record.total_weighted;
        
        IF v_total_weighted > v_goal THEN
            v_total_value := (v_total_weighted - v_goal) * 30.00;
        ELSE
            v_total_value := 0;
        END IF;

        INSERT INTO public.bonus_provisions (
            user_id, 
            month, 
            status, 
            total_value, 
            payout_date, 
            calculation_details, 
            updated_at
        )
        VALUES (
            v_record.user_id, 
            p_month, 
            'pending', 
            v_total_value, 
            v_payout_date, 
            jsonb_build_object(
                'goal', v_goal,
                'total_weighted', v_total_weighted,
                'excess', GREATEST(0, v_total_weighted - v_goal),
                'rate', 30.00
            ),
            now()
        )
        ON CONFLICT (user_id, month) DO UPDATE 
        SET 
            total_value = EXCLUDED.total_value, 
            calculation_details = EXCLUDED.calculation_details,
            updated_at = now();
    END LOOP;
END;
$$;


ALTER FUNCTION "public"."calculate_monthly_provisions"("p_month" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."core_complete_deadline"("payload" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_process_id text;
  v_data_agendamento date;
  v_completed_by text;
  v_activity_type text;
  v_timesheet_entry_id text;
  
  v_affected_rows integer;
BEGIN
  v_process_id := payload->>'process_id';
  v_data_agendamento := (payload->>'data_agendamento')::date;
  v_completed_by := payload->>'completed_by';
  v_activity_type := payload->>'completion_activity_type';
  v_timesheet_entry_id := payload->>'timesheet_entry_id'; -- novo mapeamento

  IF v_process_id IS NULL OR v_data_agendamento IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Campos obligatorios faltando: process_id, data_agendamento');
  END IF;

  -- Realiza a baixa do prazo combinando CNJ + Janela de prazo de 7 dias com a data do agendamento concluído
  WITH updated AS (
    UPDATE public.process_deadlines
    SET 
      is_completed = true,
      completed_at = v_data_agendamento,
      completed_by = v_completed_by::uuid,
      ultimo_andamento = COALESCE(v_activity_type, ultimo_andamento),
      timesheet_entry_id = v_timesheet_entry_id::uuid
    WHERE process_id = v_process_id
      AND is_completed = false
      AND (data_prazo::date >= v_data_agendamento - INTERVAL '7 days' AND data_prazo::date <= v_data_agendamento + INTERVAL '7 days')
    RETURNING id
  )
  SELECT COUNT(*) INTO v_affected_rows FROM updated;

  RETURN jsonb_build_object('success', true, 'completed_count', v_affected_rows);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;


ALTER FUNCTION "public"."core_complete_deadline"("payload" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."core_create_deadline"("payload" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_process_id text;
  v_data_prazo text;
  v_ocorrencia text;
  v_source text;
  v_id_tarefa_externa text;
  v_solicitacao_id text;
  v_urgente boolean;
  
  v_existing_id uuid;
  v_new_id uuid;
BEGIN
  -- Extract values
  v_process_id := payload->>'process_id';
  v_data_prazo := payload->>'data_prazo';
  v_ocorrencia := payload->>'ocorrencia';
  v_source := payload->>'source';
  v_id_tarefa_externa := payload->>'id_tarefa_externa';
  v_solicitacao_id := payload->>'solicitacao_id';
  v_urgente := (payload->>'urgente')::boolean;

  IF v_process_id IS NULL OR v_data_prazo IS NULL OR v_ocorrencia IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Campos obligatorios faltando: process_id, data_prazo, ocorrencia');
  END IF;

  -- Verifica se existe um prazo ativo idêntico (Índice parcial de unicidade na prática)
  SELECT id INTO v_existing_id
  FROM public.process_deadlines
  WHERE process_id = v_process_id
    AND data_prazo::date = (v_data_prazo)::date
    AND ocorrencia = v_ocorrencia
    AND is_completed = false
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.process_deadlines
       SET detalhes = COALESCE(payload->>'detalhes', detalhes),
           ultimo_andamento = COALESCE(payload->>'ultimo_andamento', ultimo_andamento),
           assigned_to = COALESCE((payload->>'assigned_to')::uuid, assigned_to),
           realizado_por = COALESCE((payload->>'realizado_por')::uuid, realizado_por),
           completed_by = COALESCE((payload->>'completed_by')::uuid, completed_by),
           is_completed = COALESCE((payload->>'is_completed')::boolean, is_completed),
           completed_at = COALESCE(payload->>'completed_at', completed_at),
           urgente = COALESCE((payload->>'urgente')::boolean, urgente)
     WHERE id = v_existing_id;
     
    RETURN jsonb_build_object('success', true, 'action', 'updated_duplicate', 'id', v_existing_id);
  END IF;

  -- Se possui Tarefa Externa, valida também.
  IF v_id_tarefa_externa IS NOT NULL THEN
     SELECT id INTO v_existing_id FROM public.process_deadlines WHERE id_tarefa_externa = v_id_tarefa_externa LIMIT 1;
     IF v_existing_id IS NOT NULL THEN
        UPDATE public.process_deadlines
           SET detalhes = COALESCE(payload->>'detalhes', detalhes),
               ultimo_andamento = COALESCE(payload->>'ultimo_andamento', ultimo_andamento),
               assigned_to = COALESCE((payload->>'assigned_to')::uuid, assigned_to),
               realizado_por = COALESCE((payload->>'realizado_por')::uuid, realizado_por),
               completed_by = COALESCE((payload->>'completed_by')::uuid, completed_by),
               is_completed = COALESCE((payload->>'is_completed')::boolean, is_completed),
               completed_at = COALESCE(payload->>'completed_at', completed_at),
               urgente = COALESCE((payload->>'urgente')::boolean, urgente)
         WHERE id = v_existing_id;
        RETURN jsonb_build_object('success', true, 'action', 'updated_duplicate_external', 'id', v_existing_id);
     END IF;
  END IF;

  -- Inserção Limpa
  INSERT INTO public.process_deadlines (
    process_id, data_prazo, ocorrencia, source, id_tarefa_externa, solicitacao_id, urgente,
    detalhes, ultimo_andamento, assigned_to, realizado_por, completed_by, is_completed, completed_at
  ) VALUES (
    v_process_id, (v_data_prazo)::date, v_ocorrencia, v_source, v_id_tarefa_externa, v_solicitacao_id, v_urgente,
    payload->>'detalhes', payload->>'ultimo_andamento', (payload->>'assigned_to')::uuid, (payload->>'realizado_por')::uuid,
    (payload->>'completed_by')::uuid, COALESCE((payload->>'is_completed')::boolean, false), payload->>'completed_at'
  ) RETURNING id INTO v_new_id;

  RETURN jsonb_build_object('success', true, 'action', 'inserted', 'id', v_new_id);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;


ALTER FUNCTION "public"."core_create_deadline"("payload" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_timesheet_unique_index"() RETURNS "text"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS uq_timesheet_no_duplicates
  ON public.timesheet_entries (
    user_id,
    COALESCE(process_id::text, ''),
    COALESCE(activity_type_id::text, ''),
    data_atividade,
    descricao,
    COALESCE(reclamante_nome, '')
  );
  RETURN 'created';
EXCEPTION WHEN OTHERS THEN
  RETURN SQLERRM;
END;
$$;


ALTER FUNCTION "public"."create_timesheet_unique_index"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_timesheet_duplicates_batch"("p_batch_size" integer DEFAULT 1000) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_deleted integer;
BEGIN
  -- Usar ctid para identificar duplicatas de forma eficiente
  -- Mantém o registro com menor ctid (equivalente ao mais antigo na prática)
  WITH to_delete AS (
    SELECT id
    FROM public.timesheet_entries t1
    WHERE EXISTS (
      SELECT 1
      FROM public.timesheet_entries t2
      WHERE t2.user_id = t1.user_id
        AND COALESCE(t2.process_id::text, '') = COALESCE(t1.process_id::text, '')
        AND COALESCE(t2.activity_type_id::text, '') = COALESCE(t1.activity_type_id::text, '')
        AND t2.data_atividade = t1.data_atividade
        AND t2.descricao = t1.descricao
        AND COALESCE(t2.reclamante_nome, '') = COALESCE(t1.reclamante_nome, '')
        AND t2.created_at < t1.created_at
    )
    LIMIT p_batch_size
  )
  DELETE FROM public.timesheet_entries
  WHERE id IN (SELECT id FROM to_delete);

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;


ALTER FUNCTION "public"."delete_timesheet_duplicates_batch"("p_batch_size" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_timesheet_duplicates_v2"("p_batch_size" integer DEFAULT 1000) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_deleted integer;
BEGIN
  -- First, for duplicates that are referenced by process_deadlines,
  -- update the FK to point to the kept record (lowest id)
  WITH ranked AS (
    SELECT id, user_id,
           COALESCE(process_id::text, '') as pid,
           COALESCE(activity_type_id::text, '') as atid,
           data_atividade,
           descricao,
           COALESCE(reclamante_nome, '') as rn,
           ROW_NUMBER() OVER (
             PARTITION BY user_id,
                          COALESCE(process_id::text, ''),
                          COALESCE(activity_type_id::text, ''),
                          data_atividade,
                          descricao,
                          COALESCE(reclamante_nome, '')
             ORDER BY id
           ) AS row_num,
           FIRST_VALUE(id) OVER (
             PARTITION BY user_id,
                          COALESCE(process_id::text, ''),
                          COALESCE(activity_type_id::text, ''),
                          data_atividade,
                          descricao,
                          COALESCE(reclamante_nome, '')
             ORDER BY id
           ) AS keep_id
    FROM public.timesheet_entries
  ),
  dups AS (
    SELECT id, keep_id FROM ranked WHERE row_num > 1 LIMIT p_batch_size
  )
  UPDATE public.process_deadlines pd
  SET timesheet_entry_id = d.keep_id
  FROM dups d
  WHERE pd.timesheet_entry_id = d.id;

  -- Now delete the duplicates
  WITH ranked AS (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY user_id,
                          COALESCE(process_id::text, ''),
                          COALESCE(activity_type_id::text, ''),
                          data_atividade,
                          descricao,
                          COALESCE(reclamante_nome, '')
             ORDER BY id
           ) AS rn
    FROM public.timesheet_entries
  ),
  to_delete AS (
    SELECT id FROM ranked WHERE rn > 1 LIMIT p_batch_size
  )
  DELETE FROM public.timesheet_entries
  WHERE id IN (SELECT id FROM to_delete);

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;


ALTER FUNCTION "public"."delete_timesheet_duplicates_v2"("p_batch_size" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_all_deadlines_with_details"("p_user_id" "uuid" DEFAULT NULL::"uuid", "p_team_user_ids" "uuid"[] DEFAULT NULL::"uuid"[], "p_date_from" "date" DEFAULT NULL::"date", "p_date_to" "date" DEFAULT NULL::"date") RETURNS TABLE("id" "uuid", "process_id" "uuid", "data_prazo" "date", "ocorrencia" "text", "detalhes" "text", "is_completed" boolean, "assigned_to" "uuid", "completed_by" "uuid", "ultimo_andamento" "text", "solicitacao_id" "uuid", "numero_processo" "text", "numero_pasta" integer, "reclamante_nome" "text", "reclamadas" "text"[], "area" "text", "assigned_user_name" "text", "completed_by_name" "text", "solicitacao_titulo" "text", "solicitacao_prioridade" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT
    pd.id,
    pd.process_id,
    pd.data_prazo,
    pd.ocorrencia,
    pd.detalhes,
    COALESCE(pd.is_completed, false) AS is_completed,
    pd.assigned_to,
    pd.completed_by,
    pd.ultimo_andamento,
    pd.solicitacao_id,
    p.numero_processo,
    p.numero_pasta,
    p.reclamante_nome,
    p.reclamadas,
    p.area,
    pa.full_name AS assigned_user_name,
    pc.full_name AS completed_by_name,
    s.titulo AS solicitacao_titulo,
    s.prioridade AS solicitacao_prioridade
  FROM process_deadlines pd
  INNER JOIN processes p ON p.id = pd.process_id
  LEFT JOIN profiles pa ON pa.user_id = pd.assigned_to
  LEFT JOIN profiles pc ON pc.user_id = pd.completed_by
  LEFT JOIN solicitacoes s ON s.id = pd.solicitacao_id
  WHERE
    (p_date_from IS NULL OR pd.data_prazo >= p_date_from)
    AND (p_date_to IS NULL OR pd.data_prazo <= p_date_to)
    AND (
      p_user_id IS NULL
      OR pd.assigned_to = p_user_id
      OR (p_team_user_ids IS NOT NULL AND pd.assigned_to = ANY(p_team_user_ids))
    )
  ORDER BY pd.data_prazo ASC;
$$;


ALTER FUNCTION "public"."get_all_deadlines_with_details"("p_user_id" "uuid", "p_team_user_ids" "uuid"[], "p_date_from" "date", "p_date_to" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_cashflow_summary"("p_start_date" "date", "p_end_date" "date", "p_branch_ids" "uuid"[] DEFAULT NULL::"uuid"[]) RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."get_cashflow_summary"("p_start_date" "date", "p_end_date" "date", "p_branch_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_coordinator_for_client"("p_client_id" "uuid") RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
SELECT p.user_id
  FROM team_clients tc
  JOIN profiles p ON p.id = tc.team_lead_id AND p.is_active = true
  WHERE tc.client_id = p_client_id
  LIMIT 1
$$;


ALTER FUNCTION "public"."get_coordinator_for_client"("p_client_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_cost_center_summary"("p_start_date" "date", "p_end_date" "date", "p_branch_id" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."get_cost_center_summary"("p_start_date" "date", "p_end_date" "date", "p_branch_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_dashboard_stats"("p_user_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."get_dashboard_stats"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_financial_dre_summary"("p_start_date" "date", "p_end_date" "date") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."get_financial_dre_summary"("p_start_date" "date", "p_end_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_goal_progress_data"("p_month_start" "date", "p_month_end" "date", "p_user_ids" "uuid"[]) RETURNS TABLE("user_id" "uuid", "total_weighted" numeric)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
    SELECT
      te.user_id,
      SUM(te.quantidade * COALESCE(at.weight, 1))::NUMERIC AS total_weighted
    FROM timesheet_entries te
    LEFT JOIN activity_types at ON at.id = te.activity_type_id
    WHERE te.data_atividade BETWEEN p_month_start AND p_month_end
      AND te.user_id = ANY(p_user_ids)
    GROUP BY te.user_id;
END;
$$;


ALTER FUNCTION "public"."get_goal_progress_data"("p_month_start" "date", "p_month_end" "date", "p_user_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_permission_scope"("_user_id" "uuid", "_module" "text", "_action" "text") RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
SELECT COALESCE(
    (SELECT upo.scope FROM user_permission_overrides upo
     JOIN permissions p ON p.id = upo.permission_id
     WHERE upo.user_id = _user_id AND p.module = _module AND p.action = _action AND upo.granted = true
     LIMIT 1),
    (SELECT rp.scope FROM role_permissions rp
     JOIN permissions p ON p.id = rp.permission_id
     JOIN user_roles ur ON ur.role = rp.role
     WHERE ur.user_id = _user_id AND p.module = _module AND p.action = _action
     ORDER BY CASE rp.scope WHEN 'all' THEN 1 WHEN 'team' THEN 2 WHEN 'own' THEN 3 END
     LIMIT 1)
  )
$$;


ALTER FUNCTION "public"."get_permission_scope"("_user_id" "uuid", "_module" "text", "_action" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_prazos_abertos_report"() RETURNS TABLE("id" "uuid", "processo" "text", "numero_pasta" "text", "reclamante" "text", "reclamadas" "text", "area" "text", "cliente" "text", "ocorrencia" "text", "data_prazo" "date", "responsavel" "text", "source" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."get_prazos_abertos_report"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_prazos_rows"("p_month" "date", "p_responsavel_id" "uuid" DEFAULT NULL::"uuid", "p_page" integer DEFAULT 1, "p_page_size" integer DEFAULT 50, "p_search" "text" DEFAULT NULL::"text", "p_status" "text"[] DEFAULT NULL::"text"[]) RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_month_start date;
  v_month_end date;
  v_today date;
  v_offset integer;
  v_total bigint;
  v_rows jsonb;
  v_is_admin boolean;
  v_is_coordinator boolean;
  v_is_financeiro boolean;
  v_user_id uuid;
  v_profile_id uuid;
  v_team_filter uuid[];
BEGIN
  v_user_id := auth.uid();
  v_month_start := date_trunc('month', p_month)::date;
  v_month_end := (date_trunc('month', p_month) + interval '1 month' - interval '1 day')::date;
  v_today := current_date;
  v_offset := (p_page - 1) * p_page_size;

  -- Role checks
  v_is_admin := public.is_admin_or_manager(v_user_id);
  v_is_coordinator := public.is_coordinator_or_above(v_user_id);
  v_is_financeiro := public.is_financeiro(v_user_id);

  IF NOT v_is_admin AND NOT v_is_financeiro THEN
    SELECT id INTO v_profile_id FROM profiles WHERE user_id = v_user_id;
    IF v_is_coordinator AND v_profile_id IS NOT NULL THEN
      SELECT array_agg(p.user_id) INTO v_team_filter
      FROM profiles p WHERE p.reports_to = v_profile_id;
      IF v_team_filter IS NULL THEN
        v_team_filter := ARRAY[v_user_id];
      ELSE
        v_team_filter := v_team_filter || v_user_id;
      END IF;
    ELSE
      v_team_filter := ARRAY[v_user_id];
    END IF;
  END IF;

  -- Count total
  SELECT COUNT(*) INTO v_total
  FROM process_deadlines pd
  WHERE pd.data_prazo BETWEEN v_month_start AND v_month_end
    AND (p_responsavel_id IS NULL OR pd.assigned_to = p_responsavel_id)
    AND (v_team_filter IS NULL OR pd.assigned_to = ANY(v_team_filter))
    AND (
      array_length(p_status_filters, 1) IS NULL
      OR array_length(p_status_filters, 1) = 0
      OR (
        ('concluido' = ANY(p_status_filters) AND pd.is_completed)
        OR ('atrasado' = ANY(p_status_filters) AND NOT pd.is_completed AND pd.data_prazo < v_today)
        OR ('hoje' = ANY(p_status_filters) AND NOT pd.is_completed AND pd.data_prazo = v_today)
        OR ('futuro' = ANY(p_status_filters) AND NOT pd.is_completed AND pd.data_prazo > v_today)
      )
    );

  -- Fetch rows
  SELECT jsonb_agg(row_to_json(t)) INTO v_rows
  FROM (
    SELECT
      pd.id,
      proc.numero_processo as processo,
      pd.ocorrencia,
      pd.data_prazo::text as data_prazo,
      CASE
        WHEN pd.is_completed AND (pd.completed_at IS NULL OR pd.completed_at::date <= pd.data_prazo) THEN 'cumprido'
        WHEN pd.is_completed AND pd.completed_at IS NOT NULL AND pd.completed_at::date > pd.data_prazo THEN 'atrasado'
        WHEN NOT pd.is_completed AND pd.data_prazo < v_today THEN 'atrasado'
        ELSE 'pendente'
      END as status,
      COALESCE(pr.full_name, 'Não atribuído') as responsavel,
      pd.assigned_to as responsavel_id,
      CASE
        WHEN NOT pd.is_completed AND pd.data_prazo < v_today THEN (v_today - pd.data_prazo)
        WHEN pd.is_completed AND pd.completed_at IS NOT NULL AND pd.completed_at::date > pd.data_prazo THEN (pd.completed_at::date - pd.data_prazo)
        ELSE 0
      END as dias_atraso,
      CASE
        WHEN pd.is_completed THEN 'concluido'
        WHEN pd.data_prazo < v_today THEN 'atrasado'
        WHEN pd.data_prazo = v_today THEN 'hoje'
        ELSE 'futuro'
      END as view_category
    FROM process_deadlines pd
    JOIN processes proc ON proc.id = pd.process_id
    LEFT JOIN profiles pr ON pr.user_id = pd.assigned_to
    WHERE pd.data_prazo BETWEEN v_month_start AND v_month_end
      AND (p_responsavel_id IS NULL OR pd.assigned_to = p_responsavel_id)
      AND (v_team_filter IS NULL OR pd.assigned_to = ANY(v_team_filter))
      AND (
        array_length(p_status_filters, 1) IS NULL
        OR array_length(p_status_filters, 1) = 0
        OR (
          ('concluido' = ANY(p_status_filters) AND pd.is_completed)
          OR ('atrasado' = ANY(p_status_filters) AND NOT pd.is_completed AND pd.data_prazo < v_today)
          OR ('hoje' = ANY(p_status_filters) AND NOT pd.is_completed AND pd.data_prazo = v_today)
          OR ('futuro' = ANY(p_status_filters) AND NOT pd.is_completed AND pd.data_prazo > v_today)
        )
      )
    ORDER BY pd.data_prazo ASC
    LIMIT p_page_size
    OFFSET v_offset
  ) t;

  RETURN jsonb_build_object(
    'rows', COALESCE(v_rows, '[]'::jsonb),
    'total', v_total,
    'page', p_page,
    'page_size', p_page_size,
    'total_pages', CEIL(v_total::numeric / p_page_size::numeric)::integer
  );
END;
$$;


ALTER FUNCTION "public"."get_prazos_rows"("p_month" "date", "p_responsavel_id" "uuid", "p_page" integer, "p_page_size" integer, "p_search" "text", "p_status" "text"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_prazos_summary"("p_month" "date", "p_responsavel_id" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_month_start date;
  v_month_end date;
  v_today date;
  v_result jsonb;
  v_summary jsonb;
  v_chart jsonb;
  v_ranking jsonb;
  v_is_admin boolean;
  v_is_coordinator boolean;
  v_is_financeiro boolean;
  v_user_id uuid;
  v_profile_id uuid;
  v_team_filter uuid[];
BEGIN
  v_user_id := auth.uid();
  v_month_start := date_trunc('month', p_month)::date;
  v_month_end := (date_trunc('month', p_month) + interval '1 month' - interval '1 day')::date;
  v_today := current_date;

  -- Role checks
  v_is_admin := public.is_admin_or_manager(v_user_id);
  v_is_coordinator := public.is_coordinator_or_above(v_user_id);
  v_is_financeiro := public.is_financeiro(v_user_id);

  -- Build team filter for non-admin users
  IF NOT v_is_admin AND NOT v_is_financeiro THEN
    SELECT id INTO v_profile_id FROM profiles WHERE user_id = v_user_id;
    IF v_is_coordinator AND v_profile_id IS NOT NULL THEN
      SELECT array_agg(p.user_id) INTO v_team_filter
      FROM profiles p WHERE p.reports_to = v_profile_id;
      IF v_team_filter IS NULL THEN
        v_team_filter := ARRAY[v_user_id];
      ELSE
        v_team_filter := v_team_filter || v_user_id;
      END IF;
    ELSE
      v_team_filter := ARRAY[v_user_id];
    END IF;
  END IF;

  -- Summary counts for the selected month only
  SELECT jsonb_build_object(
    'total', COUNT(*),
    'cumpridos', COUNT(*) FILTER (WHERE is_completed AND (completed_at IS NULL OR completed_at::date <= data_prazo)),
    'atrasados', COUNT(*) FILTER (WHERE
      (is_completed AND completed_at IS NOT NULL AND completed_at::date > data_prazo) OR
      (NOT is_completed AND data_prazo < v_today)
    ),
    'pendentes', COUNT(*) FILTER (WHERE NOT is_completed AND data_prazo >= v_today),
    'taxa', CASE
      WHEN COUNT(*) > 0 THEN
        ROUND((COUNT(*) FILTER (WHERE is_completed AND (completed_at IS NULL OR completed_at::date <= data_prazo))::numeric / COUNT(*)::numeric) * 100, 1)
      ELSE 0
    END
  ) INTO v_summary
  FROM process_deadlines pd
  WHERE pd.data_prazo BETWEEN v_month_start AND v_month_end
    AND (p_responsavel_id IS NULL OR pd.assigned_to = p_responsavel_id)
    AND (v_team_filter IS NULL OR pd.assigned_to = ANY(v_team_filter));

  -- Monthly chart: last 6 months
  SELECT jsonb_agg(row_to_json(t) ORDER BY t.month_start) INTO v_chart
  FROM (
    SELECT
      to_char(gs.month_start, 'Mon/YY') as month,
      COUNT(*) FILTER (WHERE pd.is_completed AND (pd.completed_at IS NULL OR pd.completed_at::date <= pd.data_prazo)) as cumpridos,
      COUNT(*) FILTER (WHERE
        (pd.is_completed AND pd.completed_at IS NOT NULL AND pd.completed_at::date > pd.data_prazo) OR
        (NOT pd.is_completed AND pd.data_prazo < v_today)
      ) as atrasados,
      gs.month_start
    FROM generate_series(
      date_trunc('month', p_month - interval '5 months')::date,
      date_trunc('month', p_month)::date,
      '1 month'::interval
    ) gs(month_start)
    LEFT JOIN process_deadlines pd ON pd.data_prazo BETWEEN gs.month_start::date AND (gs.month_start + interval '1 month' - interval '1 day')::date
      AND (p_responsavel_id IS NULL OR pd.assigned_to = p_responsavel_id)
      AND (v_team_filter IS NULL OR pd.assigned_to = ANY(v_team_filter))
    GROUP BY gs.month_start
  ) t;

  -- Ranking by responsavel (for the selected month)
  SELECT jsonb_agg(row_to_json(t) ORDER BY t.taxa DESC) INTO v_ranking
  FROM (
    SELECT
      COALESCE(pr.full_name, 'Não atribuído') as name,
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE pd.is_completed AND (pd.completed_at IS NULL OR pd.completed_at::date <= pd.data_prazo)) as cumpridos,
      CASE
        WHEN COUNT(*) > 0 THEN
          ROUND((COUNT(*) FILTER (WHERE pd.is_completed AND (pd.completed_at IS NULL OR pd.completed_at::date <= pd.data_prazo))::numeric / COUNT(*)::numeric) * 100, 1)
        ELSE 0
      END as taxa
    FROM process_deadlines pd
    LEFT JOIN profiles pr ON pr.user_id = pd.assigned_to
    WHERE pd.data_prazo BETWEEN v_month_start AND v_month_end
      AND (p_responsavel_id IS NULL OR pd.assigned_to = p_responsavel_id)
      AND (v_team_filter IS NULL OR pd.assigned_to = ANY(v_team_filter))
    GROUP BY pr.full_name
    HAVING COUNT(*) >= 1
  ) t;

  v_result := jsonb_build_object(
    'summary', COALESCE(v_summary, '{""total"":0,""cumpridos"":0,""atrasados"":0,""pendentes"":0,""taxa"":0}'::jsonb),
    'monthlyChart', COALESCE(v_chart, '[]'::jsonb),
    'ranking', COALESCE(v_ranking, '[]'::jsonb)
  );

  RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."get_prazos_summary"("p_month" "date", "p_responsavel_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_process_counts_by_client"() RETURNS TABLE("client_id" "uuid", "process_count" bigint)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT id_cliente, count(*) 
  FROM processes 
  WHERE id_cliente IS NOT NULL 
  GROUP BY id_cliente;
$$;


ALTER FUNCTION "public"."get_process_counts_by_client"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_producao_aggregated"("p_start" "date", "p_end" "date", "p_user_id" "uuid", "p_is_admin" boolean, "p_dimension" "text") RETURNS TABLE("label" "text", "pontos" numeric, "lancamentos" bigint)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_is_admin BOOLEAN;
BEGIN
  -- Validate p_is_admin against actual roles instead of trusting frontend
  SELECT public.is_admin_or_manager(auth.uid()) OR public.is_coordinator_or_above(auth.uid()) INTO v_is_admin;
  
  -- If caller claims admin but isn't, restrict to own data
  IF p_is_admin AND NOT v_is_admin THEN
    p_is_admin := false;
  END IF;

  IF p_dimension = 'usuario' THEN
    RETURN QUERY
      SELECT
        COALESCE(pr.full_name, 'Desconhecido') AS label,
        SUM(te.quantidade * COALESCE(at.weight, 1))::NUMERIC AS pontos,
        COUNT(*)::BIGINT AS lancamentos
      FROM timesheet_entries te
      LEFT JOIN activity_types at ON at.id = te.activity_type_id
      LEFT JOIN profiles pr ON pr.user_id = te.user_id
      WHERE te.data_atividade BETWEEN p_start AND p_end
        AND (p_is_admin OR te.user_id = p_user_id)
      GROUP BY pr.full_name
      ORDER BY pontos DESC;

  ELSIF p_dimension = 'cliente' THEN
    RETURN QUERY
      SELECT
        COALESCE(c.nome, c.razao_social, 'Sem cliente') AS label,
        SUM(te.quantidade * COALESCE(at.weight, 1))::NUMERIC AS pontos,
        COUNT(*)::BIGINT AS lancamentos
      FROM timesheet_entries te
      LEFT JOIN activity_types at ON at.id = te.activity_type_id
      LEFT JOIN processes p ON p.id = te.process_id
      LEFT JOIN clients c ON c.id = p.id_cliente
      WHERE te.data_atividade BETWEEN p_start AND p_end
        AND (p_is_admin OR te.user_id = p_user_id)
      GROUP BY COALESCE(c.nome, c.razao_social, 'Sem cliente')
      ORDER BY pontos DESC;

  ELSIF p_dimension = 'equipe' THEN
    RETURN QUERY
      SELECT
        COALESCE(coord.full_name, 'Sem coordenador') AS label,
        SUM(te.quantidade * COALESCE(at.weight, 1))::NUMERIC AS pontos,
        COUNT(*)::BIGINT AS lancamentos
      FROM timesheet_entries te
      LEFT JOIN activity_types at ON at.id = te.activity_type_id
      LEFT JOIN profiles pr ON pr.user_id = te.user_id
      LEFT JOIN profiles coord ON coord.id = pr.reports_to
      WHERE te.data_atividade BETWEEN p_start AND p_end
        AND (p_is_admin OR te.user_id = p_user_id)
      GROUP BY COALESCE(coord.full_name, 'Sem coordenador')
      ORDER BY pontos DESC;

  ELSIF p_dimension = 'atividade' THEN
    RETURN QUERY
      SELECT
        COALESCE(at.name, 'Sem tipo') AS label,
        SUM(te.quantidade * COALESCE(at.weight, 1))::NUMERIC AS pontos,
        COUNT(*)::BIGINT AS lancamentos
      FROM timesheet_entries te
      LEFT JOIN activity_types at ON at.id = te.activity_type_id
      WHERE te.data_atividade BETWEEN p_start AND p_end
        AND (p_is_admin OR te.user_id = p_user_id)
      GROUP BY COALESCE(at.name, 'Sem tipo')
      ORDER BY pontos DESC;

  ELSE
    RAISE EXCEPTION 'Dimensão inválida: %', p_dimension;
  END IF;
END;
$$;


ALTER FUNCTION "public"."get_producao_aggregated"("p_start" "date", "p_end" "date", "p_user_id" "uuid", "p_is_admin" boolean, "p_dimension" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_produtividade_report"("p_month" "date", "p_area" "text" DEFAULT NULL::"text", "p_collaborator_id" "uuid" DEFAULT NULL::"uuid", "p_client_id" "uuid" DEFAULT NULL::"uuid", "p_coordinator_id" "uuid" DEFAULT NULL::"uuid", "p_user_id" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."get_produtividade_report"("p_month" "date", "p_area" "text", "p_collaborator_id" "uuid", "p_client_id" "uuid", "p_coordinator_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_profile_id_for_user"("_user_id" "uuid") RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT id FROM public.profiles WHERE user_id = _user_id LIMIT 1;
$$;


ALTER FUNCTION "public"."get_profile_id_for_user"("_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_revenue_projection"() RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."get_revenue_projection"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_treasury_summary"("p_start_date" "date", "p_end_date" "date") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."get_treasury_summary"("p_start_date" "date", "p_end_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_old_user_id uuid;
  v_domain text;
  v_is_authorized boolean;
BEGIN
  -- Validate email domain
  v_domain := lower(split_part(NEW.email, '@', 2));

  SELECT EXISTS (
    SELECT 1 FROM public.authorized_email_domains
    WHERE domain = v_domain AND COALESCE(active, true) = true
  ) INTO v_is_authorized;

  IF NOT v_is_authorized THEN
    DELETE FROM auth.users WHERE id = NEW.id;
    RAISE EXCEPTION 'DOMAIN_NOT_AUTHORIZED: O domínio "%" não está autorizado a acessar este sistema.', v_domain
      USING ERRCODE = 'P0001';
  END IF;

  -- Re-attach legacy profile with same email but different user_id
  SELECT user_id INTO v_old_user_id
  FROM public.profiles
  WHERE email = NEW.email
    AND user_id <> NEW.id
  LIMIT 1;

  IF v_old_user_id IS NOT NULL THEN
    UPDATE public.timesheet_entries SET user_id = NEW.id WHERE user_id = v_old_user_id;
    UPDATE public.calendar_events SET user_id = NEW.id WHERE user_id = v_old_user_id;
    UPDATE public.bonus_calculations SET user_id = NEW.id WHERE user_id = v_old_user_id;
    UPDATE public.process_deadlines SET assigned_to = NEW.id WHERE assigned_to = v_old_user_id;
    UPDATE public.process_deadlines SET completed_by = NEW.id WHERE completed_by = v_old_user_id;
    UPDATE public.user_roles SET user_id = NEW.id WHERE user_id = v_old_user_id;

    UPDATE public.profiles
    SET user_id = NEW.id,
        full_name = COALESCE(NEW.raw_user_meta_data->>'full_name', full_name),
        is_active = true
    WHERE user_id = v_old_user_id;
  ELSE
    -- Minimal profile, pending approval
    INSERT INTO public.profiles (user_id, full_name, email, is_active, approved)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
      NEW.email,
      true,
      false
    )
    ON CONFLICT (user_id) DO NOTHING;

    -- Assign temporary 'convidado' role so the user can hit /aguardando-aprovacao
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'convidado'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role = _role
    )
$$;


ALTER FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin_or_manager"("_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'gerente', 'socio')
  )
$$;


ALTER FUNCTION "public"."is_admin_or_manager"("_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_coordinator_or_above"("_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'gerente', 'socio', 'coordenador')
  )
$$;


ALTER FUNCTION "public"."is_coordinator_or_above"("_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_email_domain_authorized"("p_email" "text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.authorized_email_domains
    WHERE domain = lower(split_part(p_email, '@', 2))
  );
$$;


ALTER FUNCTION "public"."is_email_domain_authorized"("p_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_financeiro"("_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'financeiro'
  )
$$;


ALTER FUNCTION "public"."is_financeiro"("_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_leader_or_above"("_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role IN ('admin', 'gerente', 'lider')
    )
$$;


ALTER FUNCTION "public"."is_leader_or_above"("_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reconcile_open_deadlines"() RETURNS "jsonb"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_reconciled integer := 0;
  v_rec RECORD;
BEGIN
  FOR v_rec IN
    SELECT DISTINCT ON (pd.id)
      pd.id as deadline_id,
      te.data_atividade,
      te.user_id as te_user_id
    FROM process_deadlines pd
    JOIN timesheet_entries te ON te.process_id = pd.process_id
    WHERE pd.is_completed = false
      AND te.data_atividade BETWEEN pd.data_prazo - interval '7 days' AND pd.data_prazo + interval '14 days'
    ORDER BY pd.id, ABS(EXTRACT(EPOCH FROM (te.data_atividade::timestamp - pd.data_prazo::timestamp)))
    LIMIT p_batch_size
  LOOP
    UPDATE process_deadlines 
    SET is_completed = true, 
        completed_at = v_rec.data_atividade::timestamp with time zone,
        completed_by = v_rec.te_user_id
    WHERE id = v_rec.deadline_id;
    v_reconciled := v_reconciled + 1;
  END LOOP;

  RETURN jsonb_build_object('reconciled', v_reconciled);
END;
$$;


ALTER FUNCTION "public"."reconcile_open_deadlines"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reconcile_open_deadlines"("p_batch_size" integer DEFAULT 1000) RETURNS "jsonb"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_reconciled integer := 0;
  v_rec RECORD;
BEGIN
  FOR v_rec IN
    SELECT DISTINCT ON (pd.id)
      pd.id as deadline_id,
      te.data_atividade,
      te.user_id as te_user_id
    FROM process_deadlines pd
    JOIN timesheet_entries te ON te.process_id = pd.process_id
    WHERE pd.is_completed = false
      AND te.data_atividade BETWEEN pd.data_prazo - interval '7 days' AND pd.data_prazo + interval '14 days'
    ORDER BY pd.id, ABS(EXTRACT(EPOCH FROM (te.data_atividade::timestamp - pd.data_prazo::timestamp)))
    LIMIT p_batch_size
  LOOP
    UPDATE process_deadlines 
    SET is_completed = true, 
        completed_at = v_rec.data_atividade::timestamp with time zone,
        completed_by = v_rec.te_user_id
    WHERE id = v_rec.deadline_id;
    v_reconciled := v_reconciled + 1;
  END LOOP;

  RETURN jsonb_build_object('reconciled', v_reconciled);
END;
$$;


ALTER FUNCTION "public"."reconcile_open_deadlines"("p_batch_size" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."relink_orphan_timesheet_entries"() RETURNS "jsonb"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_linked integer := 0;
  v_rec RECORD;
BEGIN
  FOR v_rec IN
    WITH unique_processes AS (
      SELECT UPPER(reclamante_nome) as upper_name, (array_agg(id))[1] as proc_id
      FROM processes
      WHERE reclamante_nome IS NOT NULL AND reclamante_nome != ''
      GROUP BY UPPER(reclamante_nome)
      HAVING COUNT(*) = 1
    )
    SELECT te.id as te_id, up.proc_id
    FROM timesheet_entries te
    JOIN unique_processes up ON UPPER(te.reclamante_nome) = up.upper_name
    WHERE te.process_id IS NULL
      AND te.reclamante_nome IS NOT NULL
    LIMIT p_batch_size
  LOOP
    BEGIN
      UPDATE timesheet_entries SET process_id = v_rec.proc_id WHERE id = v_rec.te_id;
      v_linked := v_linked + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Skip duplicates, delete the orphan instead
      DELETE FROM timesheet_entries WHERE id = v_rec.te_id;
    END;
  END LOOP;

  RETURN jsonb_build_object('linked', v_linked);
END;
$$;


ALTER FUNCTION "public"."relink_orphan_timesheet_entries"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."relink_orphan_timesheet_entries"("p_batch_size" integer DEFAULT 1000) RETURNS "jsonb"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_linked integer := 0;
  v_rec RECORD;
BEGIN
  FOR v_rec IN
    WITH unique_processes AS (
      SELECT UPPER(reclamante_nome) as upper_name, (array_agg(id))[1] as proc_id
      FROM processes
      WHERE reclamante_nome IS NOT NULL AND reclamante_nome != ''
      GROUP BY UPPER(reclamante_nome)
      HAVING COUNT(*) = 1
    )
    SELECT te.id as te_id, up.proc_id
    FROM timesheet_entries te
    JOIN unique_processes up ON UPPER(te.reclamante_nome) = up.upper_name
    WHERE te.process_id IS NULL
      AND te.reclamante_nome IS NOT NULL
    LIMIT p_batch_size
  LOOP
    BEGIN
      UPDATE timesheet_entries SET process_id = v_rec.proc_id WHERE id = v_rec.te_id;
      v_linked := v_linked + 1;
    EXCEPTION WHEN unique_violation THEN
      DELETE FROM timesheet_entries WHERE id = v_rec.te_id;
    END;
  END LOOP;

  RETURN jsonb_build_object('linked', v_linked);
END;
$$;


ALTER FUNCTION "public"."relink_orphan_timesheet_entries"("p_batch_size" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reports_to_user"("_target_user_id" "uuid", "_manager_profile_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = _target_user_id
      AND reports_to = _manager_profile_id
  );
$$;


ALTER FUNCTION "public"."reports_to_user"("_target_user_id" "uuid", "_manager_profile_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."smart_assign_deadline"("p_deadline_id" "uuid") RETURNS TABLE("assigned_user_id" "uuid", "is_coordinator" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_coordinator_user_id uuid;
  v_coordinator_profile_id uuid;
  v_client_id uuid;
  v_target_area text;
  v_assigned uuid;
  v_ocorrencia_lower text;
  v_ocorrencia text;
BEGIN
  -- Obter client_id e ocorrencia a partir do deadline
  SELECT pr.id_cliente, pd.ocorrencia
  INTO v_client_id, v_ocorrencia
  FROM process_deadlines pd
  JOIN processes pr ON pr.id = pd.process_id
  WHERE pd.id = p_deadline_id;

  SELECT p.user_id, p.id
  INTO v_coordinator_user_id, v_coordinator_profile_id
  FROM team_clients tc
  JOIN profiles p ON p.id = tc.team_lead_id AND p.is_active = true
  WHERE tc.client_id = v_client_id
  LIMIT 1;

  IF v_coordinator_user_id IS NULL THEN
    RETURN QUERY SELECT NULL::uuid, true;
    RETURN;
  END IF;

  v_ocorrencia_lower := lower(extensions.unaccent(COALESCE(v_ocorrencia, '')));

  SELECT pam.area_setor INTO v_target_area
  FROM phase_area_mapping pam
  WHERE v_ocorrencia_lower LIKE '%' || pam.fase_keyword || '%'
  LIMIT 1;

  IF v_target_area IS NOT NULL THEN
    SELECT p.user_id INTO v_assigned
    FROM profiles p
    JOIN user_roles ur ON ur.user_id = p.user_id AND ur.role IN ('calculista', 'assistente', 'lider')
    WHERE p.reports_to = v_coordinator_profile_id
      AND p.is_active = true
      AND lower(p.area::text) = v_target_area
    ORDER BY (
      SELECT COUNT(*)
      FROM process_deadlines pd2
      WHERE pd2.assigned_to = p.user_id
        AND pd2.is_completed = false
    ) ASC
    LIMIT 1;

    IF v_assigned IS NOT NULL THEN
      RETURN QUERY SELECT v_assigned, false;
      RETURN;
    END IF;
  END IF;

  RETURN QUERY SELECT v_coordinator_user_id, true;
  RETURN;
END;
$$;


ALTER FUNCTION "public"."smart_assign_deadline"("p_deadline_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."uppercase_accounts"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.nome := UPPER(NEW.nome);
  NEW.responsavel_nome := UPPER(NEW.responsavel_nome);
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."uppercase_accounts"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."uppercase_billing_contacts"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.razao_social := UPPER(NEW.razao_social);
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."uppercase_billing_contacts"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."uppercase_client_contacts"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.nome := UPPER(NEW.nome);
  NEW.cargo := UPPER(NEW.cargo);
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."uppercase_client_contacts"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."uppercase_clients"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.nome := UPPER(NEW.nome);
  NEW.razao_social := UPPER(NEW.razao_social);
  NEW.nome_fantasia := UPPER(NEW.nome_fantasia);
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."uppercase_clients"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."uppercase_company_entities"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.razao_social := UPPER(NEW.razao_social);
  NEW.nome_fantasia := UPPER(NEW.nome_fantasia);
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."uppercase_company_entities"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."uppercase_contract_keys"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.nome := UPPER(NEW.nome);
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."uppercase_contract_keys"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."uppercase_economic_groups"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.nome := UPPER(NEW.nome);
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."uppercase_economic_groups"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."uppercase_processes"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.reclamante_nome := UPPER(NEW.reclamante_nome);
  IF NEW.reclamadas IS NOT NULL AND array_length(NEW.reclamadas, 1) > 0 THEN
    NEW.reclamadas := (SELECT array_agg(UPPER(elem)) FROM unnest(NEW.reclamadas) elem);
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."uppercase_processes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."uppercase_profiles"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.full_name := UPPER(NEW.full_name);
  NEW.sigla := UPPER(NEW.sigla);
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."uppercase_profiles"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."access_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "action" "text" NOT NULL,
    "module" "text",
    "record_id" "text",
    "details" "jsonb",
    "ip_address" "text",
    "user_agent" "text",
    "result" "text" DEFAULT 'success'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."access_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."accounts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nome" "text" NOT NULL,
    "tipo_conta" "text",
    "responsavel_nome" "text" NOT NULL,
    "responsavel_email" "text",
    "responsavel_telefone" "text",
    "status" "text" DEFAULT 'ativa'::"text" NOT NULL,
    "client_id" "uuid",
    "branch_id" "uuid",
    "observacoes" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."accounts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."activity_types" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "weight" numeric NOT NULL,
    "area" "public"."area_setor",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."activity_types" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."agent_executions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "execution_id" "text" NOT NULL,
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "finished_at" timestamp with time zone,
    "total_files_found" integer DEFAULT 0,
    "new_files_count" integer DEFAULT 0,
    "processed_count" integer DEFAULT 0,
    "failed_count" integer DEFAULT 0,
    "status" "public"."agent_execution_status" DEFAULT 'running'::"public"."agent_execution_status" NOT NULL,
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."agent_executions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."area_goals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "area" "public"."area_setor" NOT NULL,
    "monthly_goal" integer NOT NULL,
    "extra_value_per_calculation" numeric DEFAULT 30.00,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."area_goals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "action" "text" NOT NULL,
    "table_name" "text" NOT NULL,
    "record_id" "uuid",
    "old_data" "jsonb",
    "new_data" "jsonb",
    "ip_address" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."authorized_email_domains" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "domain" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    "active" boolean DEFAULT true NOT NULL
);


ALTER TABLE "public"."authorized_email_domains" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."bank_accounts_config" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "banco" "text" NOT NULL,
    "agencia" "text" NOT NULL,
    "conta" "text" NOT NULL,
    "tipo" "text" DEFAULT 'corrente'::"text",
    "descricao" "text",
    "is_active" boolean DEFAULT true,
    "branch_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "company_entity_id" "uuid",
    "cedente" "text",
    "carteira" "text",
    "numero_convenio" "text"
);


ALTER TABLE "public"."bank_accounts_config" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."bank_statement_entries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "statement_id" "uuid" NOT NULL,
    "data_transacao" "date" NOT NULL,
    "descricao" "text" NOT NULL,
    "valor" numeric DEFAULT 0 NOT NULL,
    "tipo" "text" DEFAULT 'credito'::"text" NOT NULL,
    "matched_invoice_id" "uuid",
    "matched_expense_id" "uuid",
    "status" "text" DEFAULT 'pendente'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."bank_statement_entries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."bank_statements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "file_name" "text" NOT NULL,
    "file_path" "text" NOT NULL,
    "bank_name" "text" NOT NULL,
    "period_start" "date",
    "period_end" "date",
    "uploaded_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."bank_statements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."banks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "codigo" "text" NOT NULL,
    "nome" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."banks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."billing_contacts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "account_id" "uuid" NOT NULL,
    "razao_social" "text" NOT NULL,
    "cpf_cnpj" "text" NOT NULL,
    "tipo_documento" "text" DEFAULT 'cnpj'::"text",
    "endereco_cep" "text",
    "endereco_logradouro" "text",
    "endereco_numero" "text",
    "endereco_complemento" "text",
    "endereco_bairro" "text",
    "endereco_cidade" "text",
    "endereco_estado" "text",
    "email_nf" "text",
    "inscricao_estadual" "text",
    "inscricao_municipal" "text",
    "nome_caso_projeto" "text",
    "centro_custo" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."billing_contacts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."billing_preview_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "preview_id" "uuid" NOT NULL,
    "timesheet_entry_id" "uuid",
    "process_id" "uuid",
    "numero_processo" "text",
    "reclamante" "text",
    "tipo_atividade" "text",
    "data_atividade" "date",
    "descricao" "text",
    "quantidade" integer DEFAULT 1 NOT NULL,
    "valor_unitario" numeric DEFAULT 0 NOT NULL,
    "valor_total" numeric DEFAULT 0 NOT NULL,
    "is_duplicate" boolean DEFAULT false NOT NULL,
    "is_billable" boolean DEFAULT true NOT NULL,
    "exclusion_reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."billing_preview_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."billing_previews" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_id" "uuid",
    "reference_month" "date" NOT NULL,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "total_items" integer DEFAULT 0 NOT NULL,
    "total_value" numeric DEFAULT 0 NOT NULL,
    "invoice_id" "uuid",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "billing_previews_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'approved'::"text", 'invoiced'::"text"])))
);


ALTER TABLE "public"."billing_previews" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."billing_provisions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_id" "uuid" NOT NULL,
    "month" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "total_value" numeric(15,2) DEFAULT 0,
    "details" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "billing_provisions_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'invoiced'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."billing_provisions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."boletos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "billing_contact_id" "uuid",
    "amount" numeric NOT NULL,
    "due_date" "date" NOT NULL,
    "status" "text" DEFAULT 'generated'::"text" NOT NULL,
    "barcode" "text",
    "our_number" "text",
    "pdf_url" "text",
    "sent_at" timestamp with time zone,
    "paid_at" timestamp with time zone,
    "notes" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."boletos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."bonus_calculations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "reference_month" "date" NOT NULL,
    "area" "public"."area_setor" NOT NULL,
    "total_weighted" numeric DEFAULT 0 NOT NULL,
    "monthly_goal" integer DEFAULT 0 NOT NULL,
    "excess_count" numeric DEFAULT 0 NOT NULL,
    "extra_value" numeric DEFAULT 0 NOT NULL,
    "bonus_amount" numeric DEFAULT 0 NOT NULL,
    "payment_month" "date" NOT NULL,
    "status" "public"."bonus_status" DEFAULT 'pending'::"public"."bonus_status" NOT NULL,
    "approved_by" "uuid",
    "approved_at" timestamp with time zone,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_billed" boolean DEFAULT false NOT NULL,
    "billed_at" timestamp with time zone,
    "billed_by" "uuid"
);


ALTER TABLE "public"."bonus_calculations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."bonus_provisions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "month" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "total_value" numeric(15,2) DEFAULT 0,
    "payout_date" "date" NOT NULL,
    "calculation_details" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "bonus_provisions_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'paid'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."bonus_provisions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."branches" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nome" "text" NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."branches" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."calculation_types" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "estimated_complexity" integer DEFAULT 1 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."calculation_types" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."calendar_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "location" "text",
    "start_at" timestamp with time zone NOT NULL,
    "end_at" timestamp with time zone NOT NULL,
    "all_day" boolean DEFAULT false,
    "event_type" "public"."event_type" DEFAULT 'outro'::"public"."event_type",
    "process_deadline_id" "uuid",
    "google_event_id" "text",
    "sync_to_google" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."calendar_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."chart_of_accounts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "type" "text" NOT NULL,
    "parent_id" "uuid",
    "level" integer DEFAULT 1,
    "active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."chart_of_accounts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."client_aliases" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "alias" "text" NOT NULL,
    "client_id" "uuid" NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."client_aliases" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."client_branches" (
    "client_id" "uuid" NOT NULL,
    "branch_id" "uuid" NOT NULL
);


ALTER TABLE "public"."client_branches" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."client_contacts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_id" "uuid" NOT NULL,
    "nome" "text" NOT NULL,
    "cargo" "text",
    "tipo" "text" NOT NULL,
    "telefone" "text",
    "celular" "text",
    "email" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."client_contacts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."client_documents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_id" "uuid" NOT NULL,
    "file_name" "text" NOT NULL,
    "file_path" "text" NOT NULL,
    "file_size" integer,
    "mime_type" "text",
    "uploaded_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."client_documents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."client_sla_rules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_id" "uuid" NOT NULL,
    "calculation_type" "text",
    "deadline_hours" integer NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."client_sla_rules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."clients" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tipo" "public"."pessoa_tipo" NOT NULL,
    "nome" "text",
    "cpf" "text",
    "data_nascimento" "date",
    "rg" "text",
    "razao_social" "text",
    "cnpj" "text",
    "nome_fantasia" "text",
    "representante_legal" "text",
    "centro_custo" "text",
    "cep" "text",
    "logradouro" "text",
    "numero" "text",
    "complemento" "text",
    "bairro" "text",
    "cidade" "text",
    "estado" "text",
    "indicacao_por" "uuid",
    "indicacao_tipo" "text",
    "indicacao_valor" numeric,
    "indicacao_responsavel" "text",
    "observacoes" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    "contrato_objeto" "text",
    "contrato_data_inicio" "date",
    "contrato_data_vencimento" "date",
    "contrato_condicoes_faturamento" "text",
    "indicacao_email" "text",
    "indicacao_banco" "text",
    "indicacao_agencia" "text",
    "indicacao_conta_corrente" "text",
    "tipo_cadastro" "public"."tipo_cadastro" DEFAULT 'cliente'::"public"."tipo_cadastro" NOT NULL,
    "metodo_pagamento" "text",
    "pix_chave" "text",
    "dados_bancarios_banco" "text",
    "dados_bancarios_agencia" "text",
    "dados_bancarios_conta" "text",
    "economic_group_id" "uuid",
    "contract_key_id" "uuid",
    "billing_reminder_enabled" boolean DEFAULT false,
    "billing_reminder_days" integer,
    "canal_importacao" "text" DEFAULT 'manual'::"text",
    "inscricao_estadual" "text",
    "inscricao_municipal" "text",
    "dia_emissao_nf" integer,
    "dia_vencimento" integer,
    "aplicar_grossup" boolean DEFAULT false,
    "tipo_grossup" "text",
    "metodo_recepcao" "text" DEFAULT 'email'::"text",
    "monitorar_contrato" boolean DEFAULT false,
    CONSTRAINT "clients_metodo_recepcao_check" CHECK (("metodo_recepcao" = ANY (ARRAY['email'::"text", 'portal_api'::"text", 'manual'::"text"])))
);


ALTER TABLE "public"."clients" OWNER TO "postgres";


COMMENT ON COLUMN "public"."clients"."metodo_recepcao" IS 'Método preferencial de recebimento de novas solicitações/prazos.';



COMMENT ON COLUMN "public"."clients"."monitorar_contrato" IS 'Se verdadeiro, o sistema enviará alertas de vencimento do contrato.';



CREATE OR REPLACE VIEW "public"."clients_safe" WITH ("security_invoker"='true') AS
 SELECT "id",
    "tipo",
    "tipo_cadastro",
    "nome",
    "razao_social",
    "cnpj",
    "nome_fantasia",
    "representante_legal",
    "centro_custo",
    "is_active",
    "created_at",
    "updated_at",
    "created_by",
    "canal_importacao",
    "economic_group_id",
    "contract_key_id",
    "cep",
    "logradouro",
    "numero",
    "complemento",
    "bairro",
    "cidade",
    "estado",
    "contrato_objeto",
    "contrato_data_inicio",
    "contrato_data_vencimento",
    "contrato_condicoes_faturamento",
    "dia_vencimento",
    "dia_emissao_nf",
    "billing_reminder_days",
    "billing_reminder_enabled",
    "inscricao_municipal",
    "inscricao_estadual",
    "aplicar_grossup",
    "tipo_grossup",
    "metodo_pagamento",
    "observacoes"
   FROM "public"."clients";


ALTER VIEW "public"."clients_safe" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."company_entities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "razao_social" "text" NOT NULL,
    "cnpj" "text" NOT NULL,
    "nome_fantasia" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."company_entities" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contract_extractions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_id" "uuid",
    "document_id" "uuid",
    "file_url" "text" NOT NULL,
    "extracted_data" "jsonb",
    "confidence" numeric,
    "missing_fields" "text"[] DEFAULT '{}'::"text"[],
    "status" "public"."extraction_status" DEFAULT 'pending'::"public"."extraction_status" NOT NULL,
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "processed_at" timestamp with time zone,
    "created_by" "uuid"
);


ALTER TABLE "public"."contract_extractions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contract_keys" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nome" "text" NOT NULL,
    "economic_group_id" "uuid",
    "descricao" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."contract_keys" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contract_pricing" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_id" "uuid",
    "cliente_nome" "text" NOT NULL,
    "contrato" "text" NOT NULL,
    "monitoramento" "text",
    "tipo_calculo" "text" NOT NULL,
    "moeda" "text" DEFAULT 'R$'::"text",
    "valor" numeric DEFAULT 0,
    "tipo_valor" "text",
    "percentual" numeric,
    "proc_andamento" integer DEFAULT 0,
    "proc_encerrado" integer DEFAULT 0,
    "cod_cliente" integer,
    "cod_contrato" integer,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "modalidade" "text",
    "data_reajuste" "date",
    "cap_valor" numeric,
    "cap_horas" numeric
);


ALTER TABLE "public"."contract_pricing" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cost_centers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "codigo" "text" NOT NULL,
    "descricao" "text" NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."cost_centers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."custom_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "label" "text" NOT NULL,
    "description" "text",
    "is_system" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."custom_roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."economic_groups" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nome" "text" NOT NULL,
    "descricao" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."economic_groups" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."expense_splits" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "expense_id" "uuid" NOT NULL,
    "centro_custo" "text" NOT NULL,
    "percentual" numeric NOT NULL,
    "valor" numeric NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."expense_splits" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."expenses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "descricao" "text" NOT NULL,
    "fornecedor" "text",
    "categoria" "text" DEFAULT 'outros'::"text" NOT NULL,
    "valor" numeric DEFAULT 0 NOT NULL,
    "data_vencimento" "date" NOT NULL,
    "data_pagamento" "date",
    "status" "text" DEFAULT 'pendente'::"text" NOT NULL,
    "numero_documento" "text",
    "observacoes" "text",
    "account_id" "uuid",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "centro_custo" "text",
    "branch_id" "uuid",
    "status_aprovacao" "text" DEFAULT 'pendente'::"text" NOT NULL,
    "aprovado_por" "uuid",
    "aprovado_em" timestamp with time zone
);


ALTER TABLE "public"."expenses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."financial_groups" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nome" "text" NOT NULL,
    "descricao" "text",
    "centros_custo" "text"[] DEFAULT '{}'::"text"[],
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."financial_groups" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."historico_axis" (
    "id" "text",
    "peso" "text",
    "lancamento" "text",
    "fechamento" "text",
    "numero_processo" "text",
    "profissional" "text",
    "equipe" "text",
    "codigo_cliente" "text",
    "cliente" "text",
    "codigo_contrato" "text",
    "contrato" "text",
    "filial" "text",
    "tipo_atividade" "text",
    "descritivo" "text",
    "observacao" "text",
    "codigo_externo" "text",
    "parte_principal" "text",
    "papel_parte_principal" "text",
    "parte_contraria" "text",
    "papel_parte_contraria" "text",
    "status_lancamento" "text",
    "corte" "text"
);


ALTER TABLE "public"."historico_axis" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invoices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "account_id" "uuid" NOT NULL,
    "billing_contact_id" "uuid" NOT NULL,
    "numero_nf" "text",
    "valor" numeric,
    "data_emissao" "date",
    "data_vencimento" "date",
    "status" "text" DEFAULT 'rascunho'::"text" NOT NULL,
    "descricao" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "nfe_status" "text" DEFAULT 'rascunho'::"text",
    "nfe_pdf_url" "text",
    "nfe_xml_url" "text",
    "nfe_protocol" "text",
    "branch_id" "uuid",
    "client_id" "uuid",
    "centro_custo" "text"
);


ALTER TABLE "public"."invoices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."monitored_emails" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "label" "text",
    "branch_id" "uuid",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."monitored_emails" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."nfse_config" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "razao_social" "text" NOT NULL,
    "cnpj" "text" NOT NULL,
    "inscricao_municipal" "text" NOT NULL,
    "codigo_servico" "text" DEFAULT '17.01'::"text" NOT NULL,
    "aliquota_iss" numeric DEFAULT 5.00 NOT NULL,
    "regime_tributario" "text" DEFAULT 'simples_nacional'::"text" NOT NULL,
    "endereco_logradouro" "text",
    "endereco_numero" "text",
    "endereco_complemento" "text",
    "endereco_bairro" "text",
    "endereco_cidade" "text" DEFAULT 'São Paulo'::"text",
    "endereco_estado" "text" DEFAULT 'SP'::"text",
    "endereco_cep" "text",
    "email_contato" "text",
    "provider" "text" DEFAULT 'webmania'::"text" NOT NULL,
    "provider_api_url" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "certificado_a1_base64" "text",
    "senha_certificado" "text",
    "codigo_tributacao_municipio" "text",
    "natureza_operacao" integer DEFAULT 1
);


ALTER TABLE "public"."nfse_config" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pautas_unificadas" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "cliente_marquesi" "text" NOT NULL,
    "numero_processo" "text" NOT NULL,
    "parte_contraria" "text",
    "id_tarefa_cliente" "text",
    "data_registro_cliente" "text",
    "tipo_servico" "text",
    "status_processamento" "text" DEFAULT 'Pendente'::"text",
    "json_original" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "observacao_calculo" "text",
    "motivo_calculo" "text",
    "tipo_decisao" "text",
    "resultado_decisao" "text"
);


ALTER TABLE "public"."pautas_unificadas" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."permissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "module" "text" NOT NULL,
    "action" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."permissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."phase_area_mapping" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "fase_keyword" "text" NOT NULL,
    "area_setor" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."phase_area_mapping" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."process_deadlines" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "process_id" "uuid" NOT NULL,
    "data_prazo" "date" NOT NULL,
    "ocorrencia" "text" NOT NULL,
    "detalhes" "text",
    "realizado_por" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "assigned_to" "uuid",
    "calendar_event_id" "text",
    "is_completed" boolean DEFAULT false,
    "completed_at" timestamp with time zone,
    "document_url" "text",
    "timesheet_entry_id" "uuid",
    "requires_attachment" boolean DEFAULT false,
    "completed_by" "uuid",
    "ultimo_andamento" "text",
    "external_id" "uuid",
    "source" "text",
    "id_tarefa_externa" "text",
    "urgente" boolean DEFAULT false,
    "solicitacao_id" "uuid"
);


ALTER TABLE "public"."process_deadlines" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."processed_files" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "drive_file_id" "text" NOT NULL,
    "file_name" "text" NOT NULL,
    "file_size" bigint,
    "file_created_at" timestamp with time zone,
    "client_id" "uuid",
    "extraction_id" "uuid",
    "folder_id" "text",
    "status" "public"."processed_file_status" DEFAULT 'pending'::"public"."processed_file_status" NOT NULL,
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "processed_at" timestamp with time zone
);


ALTER TABLE "public"."processed_files" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."processes_numero_pasta_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."processes_numero_pasta_seq" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."processes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tipo_acao" "public"."tipo_acao" NOT NULL,
    "numero_processo" "text" NOT NULL,
    "id_cliente" "uuid" NOT NULL,
    "reclamante_nome" "text" NOT NULL,
    "reclamante_nascimento" "date",
    "reclamante_cpf" "text",
    "reclamadas" "text"[] DEFAULT '{}'::"text"[],
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    "area" "public"."area_processo" DEFAULT 'trabalhista'::"public"."area_processo" NOT NULL,
    "codigo_externo" "text",
    "numero_pasta" integer DEFAULT "nextval"('"public"."processes_numero_pasta_seq"'::"regclass") NOT NULL,
    "drive_folder_id" "text",
    "data_processo" "date"
);


ALTER TABLE "public"."processes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."processing_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "source" "text" DEFAULT 'manual'::"text" NOT NULL,
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "finished_at" timestamp with time zone,
    "emails_found" integer DEFAULT 0 NOT NULL,
    "emails_processed" integer DEFAULT 0 NOT NULL,
    "errors" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."processing_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "full_name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "avatar_url" "text",
    "area" "public"."area_setor",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "reports_to" "uuid",
    "sigla" "text",
    "cpf" "text",
    "banco" "text",
    "agencia" "text",
    "conta" "text",
    "conta_digito" "text",
    "pix_key" "text",
    "branch_id" "uuid",
    "dashboard_config" "jsonb",
    "approved" boolean DEFAULT false NOT NULL,
    "approved_at" timestamp with time zone,
    "approved_by" "uuid"
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."profiles_safe" WITH ("security_invoker"='on') AS
 SELECT "id",
    "user_id",
    "full_name",
    "email",
    "area",
    "sigla",
    "is_active",
    "reports_to"
   FROM "public"."profiles";


ALTER VIEW "public"."profiles_safe" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."related_processes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "process_id" "uuid" NOT NULL,
    "numero_processo_relacionado" "text" NOT NULL,
    "tipo_relacao" "text" DEFAULT 'execucao_provisoria'::"text" NOT NULL,
    "observacoes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid"
);


ALTER TABLE "public"."related_processes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."role_permissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "role" "text" NOT NULL,
    "permission_id" "uuid" NOT NULL,
    "scope" "text" DEFAULT 'own'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."role_permissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."solicitacoes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "origem" "public"."origem_solicitacao" DEFAULT 'manual'::"public"."origem_solicitacao" NOT NULL,
    "email_id" "text",
    "email_from" "text",
    "email_subject" "text",
    "email_snippet" "text",
    "email_date" timestamp with time zone,
    "client_id" "uuid",
    "process_id" "uuid",
    "titulo" "text" NOT NULL,
    "descricao" "text",
    "status" "public"."status_solicitacao" DEFAULT 'pendente'::"public"."status_solicitacao" NOT NULL,
    "prioridade" "public"."prioridade_solicitacao" DEFAULT 'media'::"public"."prioridade_solicitacao" NOT NULL,
    "assigned_to" "uuid",
    "data_limite" "date",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "calculation_type_id" "uuid",
    "extracted_details" "jsonb",
    "source_type" "text",
    "ai_confidence" numeric,
    "id_tarefa_externa" "text",
    "area" "public"."area_processo" DEFAULT 'trabalhista'::"public"."area_processo" NOT NULL
);


ALTER TABLE "public"."solicitacoes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sync_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "finished_at" timestamp with time zone,
    "sheet_type" "text" NOT NULL,
    "rows_found" integer DEFAULT 0,
    "rows_processed" integer DEFAULT 0,
    "rows_failed" integer DEFAULT 0,
    "status" "text" DEFAULT 'running'::"text" NOT NULL,
    "details" "jsonb",
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."sync_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tax_rules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "regime" "text" NOT NULL,
    "aliquot_percentage" numeric DEFAULT 0 NOT NULL,
    "min_revenue" numeric,
    "max_revenue" numeric,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."tax_rules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."team_clients" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "team_lead_id" "uuid" NOT NULL,
    "client_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid"
);


ALTER TABLE "public"."team_clients" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."timesheet_entries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "process_id" "uuid",
    "deadline_id" "uuid",
    "activity_type_id" "uuid",
    "data_atividade" "date" NOT NULL,
    "descricao" "text" NOT NULL,
    "reclamante_nome" "text",
    "quantidade" integer DEFAULT 1 NOT NULL,
    "drive_folder_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "client_id" "uuid",
    "status_faturamento" "text",
    "observacao" "text",
    "source" "text" DEFAULT 'manual'::"text",
    "external_id" "text",
    "codigo_externo" "text",
    "approved_at" timestamp with time zone,
    "approved_by" "uuid"
);


ALTER TABLE "public"."timesheet_entries" OWNER TO "postgres";


COMMENT ON COLUMN "public"."timesheet_entries"."approved_at" IS 'Data/hora em que o lançamento foi aprovado no pré-relatório.';



COMMENT ON COLUMN "public"."timesheet_entries"."approved_by" IS 'Usuário (gestor) que aprovou o lançamento.';



CREATE TABLE IF NOT EXISTS "public"."treasury_entries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "bank_account_id" "uuid" NOT NULL,
    "tipo" "text" NOT NULL,
    "valor" numeric NOT NULL,
    "data_movimentacao" "date" NOT NULL,
    "descricao" "text",
    "conta_destino_id" "uuid",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."treasury_entries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_aliases" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "alias" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "is_old_user" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid"
);


ALTER TABLE "public"."user_aliases" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_permission_overrides" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "permission_id" "uuid" NOT NULL,
    "granted" boolean DEFAULT true NOT NULL,
    "scope" "text" DEFAULT 'own'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_permission_overrides" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_roles" OWNER TO "postgres";


ALTER TABLE ONLY "public"."access_logs"
    ADD CONSTRAINT "access_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."accounts"
    ADD CONSTRAINT "accounts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."activity_types"
    ADD CONSTRAINT "activity_types_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."activity_types"
    ADD CONSTRAINT "activity_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."agent_executions"
    ADD CONSTRAINT "agent_executions_execution_id_key" UNIQUE ("execution_id");



ALTER TABLE ONLY "public"."agent_executions"
    ADD CONSTRAINT "agent_executions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."area_goals"
    ADD CONSTRAINT "area_goals_area_key" UNIQUE ("area");



ALTER TABLE ONLY "public"."area_goals"
    ADD CONSTRAINT "area_goals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."authorized_email_domains"
    ADD CONSTRAINT "authorized_email_domains_domain_key" UNIQUE ("domain");



ALTER TABLE ONLY "public"."authorized_email_domains"
    ADD CONSTRAINT "authorized_email_domains_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bank_accounts_config"
    ADD CONSTRAINT "bank_accounts_config_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bank_statement_entries"
    ADD CONSTRAINT "bank_statement_entries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bank_statements"
    ADD CONSTRAINT "bank_statements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."banks"
    ADD CONSTRAINT "banks_codigo_key" UNIQUE ("codigo");



ALTER TABLE ONLY "public"."banks"
    ADD CONSTRAINT "banks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."billing_contacts"
    ADD CONSTRAINT "billing_contacts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."billing_preview_items"
    ADD CONSTRAINT "billing_preview_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."billing_previews"
    ADD CONSTRAINT "billing_previews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."billing_provisions"
    ADD CONSTRAINT "billing_provisions_client_id_month_key" UNIQUE ("client_id", "month");



ALTER TABLE ONLY "public"."billing_provisions"
    ADD CONSTRAINT "billing_provisions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."boletos"
    ADD CONSTRAINT "boletos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bonus_calculations"
    ADD CONSTRAINT "bonus_calculations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bonus_calculations"
    ADD CONSTRAINT "bonus_calculations_user_id_reference_month_key" UNIQUE ("reference_month", "user_id");



ALTER TABLE ONLY "public"."bonus_provisions"
    ADD CONSTRAINT "bonus_provisions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bonus_provisions"
    ADD CONSTRAINT "bonus_provisions_user_id_month_key" UNIQUE ("user_id", "month");



ALTER TABLE ONLY "public"."branches"
    ADD CONSTRAINT "branches_nome_key" UNIQUE ("nome");



ALTER TABLE ONLY "public"."branches"
    ADD CONSTRAINT "branches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."calculation_types"
    ADD CONSTRAINT "calculation_types_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."calculation_types"
    ADD CONSTRAINT "calculation_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."calendar_events"
    ADD CONSTRAINT "calendar_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chart_of_accounts"
    ADD CONSTRAINT "chart_of_accounts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."client_aliases"
    ADD CONSTRAINT "client_aliases_alias_key" UNIQUE ("alias");



ALTER TABLE ONLY "public"."client_aliases"
    ADD CONSTRAINT "client_aliases_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."client_branches"
    ADD CONSTRAINT "client_branches_pkey" PRIMARY KEY ("branch_id", "client_id");



ALTER TABLE ONLY "public"."client_contacts"
    ADD CONSTRAINT "client_contacts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."client_documents"
    ADD CONSTRAINT "client_documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."client_sla_rules"
    ADD CONSTRAINT "client_sla_rules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."company_entities"
    ADD CONSTRAINT "company_entities_cnpj_key" UNIQUE ("cnpj");



ALTER TABLE ONLY "public"."company_entities"
    ADD CONSTRAINT "company_entities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contract_extractions"
    ADD CONSTRAINT "contract_extractions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contract_keys"
    ADD CONSTRAINT "contract_keys_nome_key" UNIQUE ("nome");



ALTER TABLE ONLY "public"."contract_keys"
    ADD CONSTRAINT "contract_keys_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contract_pricing"
    ADD CONSTRAINT "contract_pricing_cliente_nome_contrato_tipo_calculo_key" UNIQUE ("cliente_nome", "contrato", "tipo_calculo");



ALTER TABLE ONLY "public"."contract_pricing"
    ADD CONSTRAINT "contract_pricing_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cost_centers"
    ADD CONSTRAINT "cost_centers_codigo_key" UNIQUE ("codigo");



ALTER TABLE ONLY "public"."cost_centers"
    ADD CONSTRAINT "cost_centers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."custom_roles"
    ADD CONSTRAINT "custom_roles_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."custom_roles"
    ADD CONSTRAINT "custom_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."economic_groups"
    ADD CONSTRAINT "economic_groups_nome_key" UNIQUE ("nome");



ALTER TABLE ONLY "public"."economic_groups"
    ADD CONSTRAINT "economic_groups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."expense_splits"
    ADD CONSTRAINT "expense_splits_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."financial_groups"
    ADD CONSTRAINT "financial_groups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."monitored_emails"
    ADD CONSTRAINT "monitored_emails_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."monitored_emails"
    ADD CONSTRAINT "monitored_emails_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."nfse_config"
    ADD CONSTRAINT "nfse_config_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pautas_unificadas"
    ADD CONSTRAINT "pautas_unificadas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."permissions"
    ADD CONSTRAINT "permissions_module_action_key" UNIQUE ("action", "module");



ALTER TABLE ONLY "public"."permissions"
    ADD CONSTRAINT "permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."phase_area_mapping"
    ADD CONSTRAINT "phase_area_mapping_fase_keyword_key" UNIQUE ("fase_keyword");



ALTER TABLE ONLY "public"."phase_area_mapping"
    ADD CONSTRAINT "phase_area_mapping_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."process_deadlines"
    ADD CONSTRAINT "process_deadlines_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."processed_files"
    ADD CONSTRAINT "processed_files_drive_file_id_key" UNIQUE ("drive_file_id");



ALTER TABLE ONLY "public"."processed_files"
    ADD CONSTRAINT "processed_files_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."processes"
    ADD CONSTRAINT "processes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."processing_logs"
    ADD CONSTRAINT "processing_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."related_processes"
    ADD CONSTRAINT "related_processes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."role_permissions"
    ADD CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."role_permissions"
    ADD CONSTRAINT "role_permissions_role_permission_id_key" UNIQUE ("permission_id", "role");



ALTER TABLE ONLY "public"."solicitacoes"
    ADD CONSTRAINT "solicitacoes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sync_logs"
    ADD CONSTRAINT "sync_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tax_rules"
    ADD CONSTRAINT "tax_rules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."team_clients"
    ADD CONSTRAINT "team_clients_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."team_clients"
    ADD CONSTRAINT "team_clients_team_lead_id_client_id_key" UNIQUE ("client_id", "team_lead_id");



ALTER TABLE ONLY "public"."timesheet_entries"
    ADD CONSTRAINT "timesheet_entries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."treasury_entries"
    ADD CONSTRAINT "treasury_entries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "unique_cnpj" UNIQUE ("cnpj");



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "unique_cpf" UNIQUE ("cpf");



ALTER TABLE ONLY "public"."pautas_unificadas"
    ADD CONSTRAINT "uq_id_tarefa_cliente" UNIQUE ("id_tarefa_cliente");



ALTER TABLE ONLY "public"."user_aliases"
    ADD CONSTRAINT "user_aliases_alias_unique" UNIQUE ("alias");



ALTER TABLE ONLY "public"."user_aliases"
    ADD CONSTRAINT "user_aliases_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_permission_overrides"
    ADD CONSTRAINT "user_permission_overrides_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_permission_overrides"
    ADD CONSTRAINT "user_permission_overrides_user_id_permission_id_key" UNIQUE ("permission_id", "user_id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_role_key" UNIQUE ("role", "user_id");



CREATE UNIQUE INDEX "idx_clients_unique_razao_social_no_doc" ON "public"."clients" USING "btree" ("upper"(TRIM(BOTH FROM "razao_social"))) WHERE (("cnpj" IS NULL) AND ("cpf" IS NULL) AND (("is_active" = true) OR ("is_active" IS NULL)));



CREATE INDEX "idx_deadlines_active_by_date" ON "public"."process_deadlines" USING "btree" ("is_completed", "data_prazo") WHERE ("is_completed" = false);



CREATE INDEX "idx_deadlines_assigned_to" ON "public"."process_deadlines" USING "btree" ("assigned_to", "is_completed");



CREATE INDEX "idx_deadlines_process_id" ON "public"."process_deadlines" USING "btree" ("process_id", "is_completed");



CREATE INDEX "idx_expenses_date_status" ON "public"."expenses" USING "btree" ("data_vencimento", "status");



CREATE INDEX "idx_expenses_pagamento" ON "public"."expenses" USING "btree" (COALESCE("data_pagamento", "data_vencimento"));



CREATE INDEX "idx_invoices_date_status" ON "public"."invoices" USING "btree" ("data_vencimento", "status");



CREATE INDEX "idx_invoices_emissao" ON "public"."invoices" USING "btree" ("data_emissao") WHERE ("status" = 'emitida'::"text");



CREATE INDEX "idx_process_deadlines_solicitacao_id" ON "public"."process_deadlines" USING "btree" ("solicitacao_id");



CREATE INDEX "idx_processes_client" ON "public"."processes" USING "btree" ("id_cliente");



CREATE INDEX "idx_timesheet_client_date" ON "public"."timesheet_entries" USING "btree" ("client_id", "data_atividade") WHERE ("client_id" IS NOT NULL);



CREATE INDEX "idx_timesheet_entries_codigo_externo" ON "public"."timesheet_entries" USING "btree" ("codigo_externo") WHERE ("codigo_externo" IS NOT NULL);



CREATE INDEX "idx_timesheet_process" ON "public"."timesheet_entries" USING "btree" ("process_id") WHERE ("process_id" IS NOT NULL);



CREATE INDEX "idx_timesheet_user_date" ON "public"."timesheet_entries" USING "btree" ("user_id", "data_atividade");



CREATE UNIQUE INDEX "idx_unique_pending_deadline" ON "public"."process_deadlines" USING "btree" ("process_id", "data_prazo", "ocorrencia") WHERE ("is_completed" = false);



CREATE INDEX "idx_user_roles_user_role" ON "public"."user_roles" USING "btree" ("user_id", "role");



CREATE UNIQUE INDEX "uq_deadline_process_date_ocorrencia" ON "public"."process_deadlines" USING "btree" ("process_id", "data_prazo", "ocorrencia") WHERE ("is_completed" = false);



CREATE UNIQUE INDEX "uq_timesheet_external_id" ON "public"."timesheet_entries" USING "btree" ("external_id") WHERE ("external_id" IS NOT NULL);



CREATE OR REPLACE TRIGGER "format_uppercase" BEFORE INSERT OR UPDATE ON "public"."accounts" FOR EACH ROW EXECUTE FUNCTION "public"."uppercase_accounts"();



CREATE OR REPLACE TRIGGER "format_uppercase" BEFORE INSERT OR UPDATE ON "public"."billing_contacts" FOR EACH ROW EXECUTE FUNCTION "public"."uppercase_billing_contacts"();



CREATE OR REPLACE TRIGGER "format_uppercase" BEFORE INSERT OR UPDATE ON "public"."clients" FOR EACH ROW EXECUTE FUNCTION "public"."uppercase_clients"();



CREATE OR REPLACE TRIGGER "format_uppercase" BEFORE INSERT OR UPDATE ON "public"."processes" FOR EACH ROW EXECUTE FUNCTION "public"."uppercase_processes"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."accounts" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."activity_types" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."area_goals" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."billing_contacts" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."boletos" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."bonus_calculations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."calendar_events" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."chart_of_accounts" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."client_contacts" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."clients" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."contract_pricing" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."expenses" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."invoices" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."nfse_config" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."pautas_unificadas" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."process_deadlines" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."processes" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."solicitacoes" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."tax_rules" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."timesheet_entries" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."treasury_entries" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_billing_previews_updated_at" BEFORE UPDATE ON "public"."billing_previews" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."accounts"
    ADD CONSTRAINT "accounts_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."accounts"
    ADD CONSTRAINT "accounts_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bank_accounts_config"
    ADD CONSTRAINT "bank_accounts_config_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bank_accounts_config"
    ADD CONSTRAINT "bank_accounts_config_company_entity_id_fkey" FOREIGN KEY ("company_entity_id") REFERENCES "public"."company_entities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bank_statement_entries"
    ADD CONSTRAINT "bank_statement_entries_matched_expense_id_fkey" FOREIGN KEY ("matched_expense_id") REFERENCES "public"."expenses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bank_statement_entries"
    ADD CONSTRAINT "bank_statement_entries_matched_invoice_id_fkey" FOREIGN KEY ("matched_invoice_id") REFERENCES "public"."invoices"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bank_statement_entries"
    ADD CONSTRAINT "bank_statement_entries_statement_id_fkey" FOREIGN KEY ("statement_id") REFERENCES "public"."bank_statements"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."billing_contacts"
    ADD CONSTRAINT "billing_contacts_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."billing_preview_items"
    ADD CONSTRAINT "billing_preview_items_preview_id_fkey" FOREIGN KEY ("preview_id") REFERENCES "public"."billing_previews"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."billing_previews"
    ADD CONSTRAINT "billing_previews_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."billing_previews"
    ADD CONSTRAINT "billing_previews_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."billing_provisions"
    ADD CONSTRAINT "billing_provisions_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id");



ALTER TABLE ONLY "public"."boletos"
    ADD CONSTRAINT "boletos_billing_contact_id_fkey" FOREIGN KEY ("billing_contact_id") REFERENCES "public"."billing_contacts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bonus_provisions"
    ADD CONSTRAINT "bonus_provisions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."calendar_events"
    ADD CONSTRAINT "calendar_events_process_deadline_id_fkey" FOREIGN KEY ("process_deadline_id") REFERENCES "public"."process_deadlines"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."client_aliases"
    ADD CONSTRAINT "client_aliases_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."client_branches"
    ADD CONSTRAINT "client_branches_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."client_branches"
    ADD CONSTRAINT "client_branches_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."client_contacts"
    ADD CONSTRAINT "client_contacts_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."client_documents"
    ADD CONSTRAINT "client_documents_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."client_sla_rules"
    ADD CONSTRAINT "client_sla_rules_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_contract_key_id_fkey" FOREIGN KEY ("contract_key_id") REFERENCES "public"."contract_keys"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_economic_group_id_fkey" FOREIGN KEY ("economic_group_id") REFERENCES "public"."economic_groups"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contract_extractions"
    ADD CONSTRAINT "contract_extractions_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contract_extractions"
    ADD CONSTRAINT "contract_extractions_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "public"."client_documents"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contract_keys"
    ADD CONSTRAINT "contract_keys_economic_group_id_fkey" FOREIGN KEY ("economic_group_id") REFERENCES "public"."economic_groups"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contract_pricing"
    ADD CONSTRAINT "contract_pricing_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."expense_splits"
    ADD CONSTRAINT "expense_splits_expense_id_fkey" FOREIGN KEY ("expense_id") REFERENCES "public"."expenses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."related_processes"
    ADD CONSTRAINT "fk_related_process" FOREIGN KEY ("process_id") REFERENCES "public"."processes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_billing_contact_id_fkey" FOREIGN KEY ("billing_contact_id") REFERENCES "public"."billing_contacts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."monitored_emails"
    ADD CONSTRAINT "monitored_emails_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."process_deadlines"
    ADD CONSTRAINT "process_deadlines_process_id_fkey" FOREIGN KEY ("process_id") REFERENCES "public"."processes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."process_deadlines"
    ADD CONSTRAINT "process_deadlines_solicitacao_id_fkey" FOREIGN KEY ("solicitacao_id") REFERENCES "public"."solicitacoes"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."processed_files"
    ADD CONSTRAINT "processed_files_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."processed_files"
    ADD CONSTRAINT "processed_files_extraction_id_fkey" FOREIGN KEY ("extraction_id") REFERENCES "public"."contract_extractions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."processes"
    ADD CONSTRAINT "processes_id_cliente_fkey" FOREIGN KEY ("id_cliente") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."related_processes"
    ADD CONSTRAINT "related_processes_process_id_fkey" FOREIGN KEY ("process_id") REFERENCES "public"."processes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."role_permissions"
    ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."solicitacoes"
    ADD CONSTRAINT "solicitacoes_calculation_type_id_fkey" FOREIGN KEY ("calculation_type_id") REFERENCES "public"."calculation_types"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."solicitacoes"
    ADD CONSTRAINT "solicitacoes_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."solicitacoes"
    ADD CONSTRAINT "solicitacoes_process_id_fkey" FOREIGN KEY ("process_id") REFERENCES "public"."processes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_clients"
    ADD CONSTRAINT "team_clients_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_clients"
    ADD CONSTRAINT "team_clients_team_lead_id_fkey" FOREIGN KEY ("team_lead_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."timesheet_entries"
    ADD CONSTRAINT "timesheet_entries_activity_type_id_fkey" FOREIGN KEY ("activity_type_id") REFERENCES "public"."activity_types"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."timesheet_entries"
    ADD CONSTRAINT "timesheet_entries_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."timesheet_entries"
    ADD CONSTRAINT "timesheet_entries_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id");



ALTER TABLE ONLY "public"."timesheet_entries"
    ADD CONSTRAINT "timesheet_entries_process_id_fkey" FOREIGN KEY ("process_id") REFERENCES "public"."processes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."treasury_entries"
    ADD CONSTRAINT "treasury_entries_bank_account_id_fkey" FOREIGN KEY ("bank_account_id") REFERENCES "public"."bank_accounts_config"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."treasury_entries"
    ADD CONSTRAINT "treasury_entries_conta_destino_id_fkey" FOREIGN KEY ("conta_destino_id") REFERENCES "public"."bank_accounts_config"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_permission_overrides"
    ADD CONSTRAINT "user_permission_overrides_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE CASCADE;



CREATE POLICY "Admin and financeiro can insert banks" ON "public"."banks" FOR INSERT WITH CHECK (("public"."has_role"("auth"."uid"(), 'admin'::"text") OR "public"."is_financeiro"("auth"."uid"())));



CREATE POLICY "Admin and financeiro can update banks" ON "public"."banks" FOR UPDATE USING (("public"."has_role"("auth"."uid"(), 'admin'::"text") OR "public"."is_financeiro"("auth"."uid"())));



CREATE POLICY "Admin can delete banks" ON "public"."banks" FOR DELETE USING ("public"."has_role"("auth"."uid"(), 'admin'::"text"));



CREATE POLICY "Admins and leaders can view sync_logs" ON "public"."sync_logs" FOR SELECT TO "authenticated" USING ("public"."is_leader_or_above"("auth"."uid"()));



CREATE POLICY "Admins and managers can insert bonus" ON "public"."bonus_calculations" FOR INSERT WITH CHECK ("public"."is_admin_or_manager"("auth"."uid"()));



CREATE POLICY "Admins and managers can update bonus" ON "public"."bonus_calculations" FOR UPDATE USING ("public"."is_admin_or_manager"("auth"."uid"()));



CREATE POLICY "Admins and managers can view access_logs" ON "public"."access_logs" FOR SELECT TO "authenticated" USING ("public"."is_admin_or_manager"("auth"."uid"()));



CREATE POLICY "Admins and managers can view all bonus" ON "public"."bonus_calculations" FOR SELECT USING ("public"."is_admin_or_manager"("auth"."uid"()));



CREATE POLICY "Admins and managers can view all entries" ON "public"."timesheet_entries" FOR SELECT USING ("public"."is_admin_or_manager"("auth"."uid"()));



CREATE POLICY "Admins and managers can view all profiles" ON "public"."profiles" FOR SELECT USING ("public"."is_admin_or_manager"("auth"."uid"()));



CREATE POLICY "Admins can delete authorized domains" ON "public"."authorized_email_domains" FOR DELETE TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"text"));



CREATE POLICY "Admins can insert authorized domains" ON "public"."authorized_email_domains" FOR INSERT TO "authenticated" WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"text"));



CREATE POLICY "Admins can manage bonus_provisions" ON "public"."bonus_provisions" TO "authenticated" USING ("public"."is_admin_or_manager"("auth"."uid"()));



CREATE POLICY "Admins can manage phase_area_mapping" ON "public"."phase_area_mapping" TO "authenticated" USING ("public"."is_admin_or_manager"("auth"."uid"())) WITH CHECK ("public"."is_admin_or_manager"("auth"."uid"()));



CREATE POLICY "Admins can update any profile" ON "public"."profiles" FOR UPDATE USING ("public"."has_role"("auth"."uid"(), 'admin'::"text"));



CREATE POLICY "Admins can update authorized domains" ON "public"."authorized_email_domains" FOR UPDATE TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"text"));



CREATE POLICY "Admins can view all audit logs" ON "public"."audit_logs" FOR SELECT USING ("public"."has_role"("auth"."uid"(), 'admin'::"text"));



CREATE POLICY "Admins can view all roles" ON "public"."user_roles" FOR SELECT USING ("public"."has_role"("auth"."uid"(), 'admin'::"text"));



CREATE POLICY "Admins can view authorized domains" ON "public"."authorized_email_domains" FOR SELECT TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"text"));



CREATE POLICY "Admins managers and finance can insert custom_roles" ON "public"."custom_roles" FOR INSERT TO "authenticated" WITH CHECK (("public"."has_role"("auth"."uid"(), 'admin'::"text") OR "public"."has_role"("auth"."uid"(), 'gerente'::"text") OR "public"."has_role"("auth"."uid"(), 'financeiro'::"text")));



CREATE POLICY "Admins managers and finance can update custom_roles" ON "public"."custom_roles" FOR UPDATE TO "authenticated" USING (("public"."has_role"("auth"."uid"(), 'admin'::"text") OR "public"."has_role"("auth"."uid"(), 'gerente'::"text") OR "public"."has_role"("auth"."uid"(), 'financeiro'::"text")));



CREATE POLICY "Allow authenticated users full access to processes" ON "public"."processes" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Assigned users can update their requests" ON "public"."solicitacoes" FOR UPDATE USING (("auth"."uid"() = "assigned_to"));



CREATE POLICY "Authenticated users can insert access_logs" ON "public"."access_logs" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Authenticated users can insert audit logs" ON "public"."audit_logs" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Authenticated users can read branches" ON "public"."branches" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can read phase_area_mapping" ON "public"."phase_area_mapping" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can view activity types" ON "public"."activity_types" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can view all accounts" ON "public"."accounts" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can view all active profiles" ON "public"."profiles" FOR SELECT TO "authenticated" USING ((("is_active" = true) OR ("reports_to" IS NOT NULL)));



CREATE POLICY "Authenticated users can view all agent executions" ON "public"."agent_executions" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can view all client documents" ON "public"."client_documents" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can view all contacts" ON "public"."client_contacts" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can view all deadlines" ON "public"."process_deadlines" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can view all extractions" ON "public"."contract_extractions" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can view all processed files" ON "public"."processed_files" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can view all processes" ON "public"."processes" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can view all related processes" ON "public"."related_processes" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can view area goals" ON "public"."area_goals" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can view banks" ON "public"."banks" FOR SELECT USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Authenticated users can view billing_provisions" ON "public"."billing_provisions" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can view calculation_types" ON "public"."calculation_types" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can view client_aliases" ON "public"."client_aliases" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can view client_branches" ON "public"."client_branches" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can view client_sla_rules" ON "public"."client_sla_rules" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can view company_entities" ON "public"."company_entities" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can view contract_keys" ON "public"."contract_keys" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can view cost_centers" ON "public"."cost_centers" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can view custom_roles" ON "public"."custom_roles" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can view economic_groups" ON "public"."economic_groups" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can view historico_axis" ON "public"."historico_axis" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can view monitored_emails" ON "public"."monitored_emails" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can view pautas" ON "public"."pautas_unificadas" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can view permissions" ON "public"."permissions" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can view processing_logs" ON "public"."processing_logs" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can view role_permissions" ON "public"."role_permissions" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can view team_clients" ON "public"."team_clients" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can view user_aliases" ON "public"."user_aliases" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Coordinators and above can insert billing_preview_items" ON "public"."billing_preview_items" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_coordinator_or_above"("auth"."uid"()) OR "public"."is_financeiro"("auth"."uid"())));



CREATE POLICY "Coordinators and above can insert billing_previews" ON "public"."billing_previews" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_coordinator_or_above"("auth"."uid"()) OR "public"."is_financeiro"("auth"."uid"())));



CREATE POLICY "Coordinators and above can update billing_preview_items" ON "public"."billing_preview_items" FOR UPDATE TO "authenticated" USING (("public"."is_coordinator_or_above"("auth"."uid"()) OR "public"."is_financeiro"("auth"."uid"())));



CREATE POLICY "Coordinators and above can update billing_previews" ON "public"."billing_previews" FOR UPDATE TO "authenticated" USING (("public"."is_coordinator_or_above"("auth"."uid"()) OR "public"."is_financeiro"("auth"."uid"())));



CREATE POLICY "Coordinators and above can view billing_preview_items" ON "public"."billing_preview_items" FOR SELECT TO "authenticated" USING (("public"."is_coordinator_or_above"("auth"."uid"()) OR "public"."is_financeiro"("auth"."uid"())));



CREATE POLICY "Coordinators and above can view billing_previews" ON "public"."billing_previews" FOR SELECT TO "authenticated" USING (("public"."is_coordinator_or_above"("auth"."uid"()) OR "public"."is_financeiro"("auth"."uid"())));



CREATE POLICY "Coordinators and admins can manage team_clients" ON "public"."team_clients" TO "authenticated" USING (("public"."is_coordinator_or_above"("auth"."uid"()) OR "public"."has_role"("auth"."uid"(), 'admin'::"text"))) WITH CHECK (("public"."is_coordinator_or_above"("auth"."uid"()) OR "public"."has_role"("auth"."uid"(), 'admin'::"text")));



CREATE POLICY "Coordinators can view team bonus" ON "public"."bonus_calculations" FOR SELECT USING (("public"."is_coordinator_or_above"("auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."user_id" = "bonus_calculations"."user_id") AND ("p"."reports_to" = ( SELECT "profiles"."id"
           FROM "public"."profiles"
          WHERE ("profiles"."user_id" = "auth"."uid"()))))))));



CREATE POLICY "Coordinators can view team events" ON "public"."calendar_events" FOR SELECT TO "authenticated" USING (("public"."is_coordinator_or_above"("auth"."uid"()) AND "public"."reports_to_user"("user_id", "public"."get_profile_id_for_user"("auth"."uid"()))));



CREATE POLICY "Coordinators can view team profiles" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("public"."is_coordinator_or_above"("auth"."uid"()) AND ("reports_to" = "public"."get_profile_id_for_user"("auth"."uid"()))));



CREATE POLICY "Finance and admins can insert billing contacts" ON "public"."billing_contacts" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_financeiro"("auth"."uid"()) OR "public"."has_role"("auth"."uid"(), 'admin'::"text")));



CREATE POLICY "Finance and admins can update billing contacts" ON "public"."billing_contacts" FOR UPDATE TO "authenticated" USING (("public"."is_financeiro"("auth"."uid"()) OR "public"."has_role"("auth"."uid"(), 'admin'::"text")));



CREATE POLICY "Finance and admins can view bank_accounts_config" ON "public"."bank_accounts_config" FOR SELECT TO "authenticated" USING (("public"."is_financeiro"("auth"."uid"()) OR "public"."has_role"("auth"."uid"(), 'admin'::"text") OR "public"."has_role"("auth"."uid"(), 'gerente'::"text")));



CREATE POLICY "Finance and admins can view billing contacts" ON "public"."billing_contacts" FOR SELECT TO "authenticated" USING (("public"."is_financeiro"("auth"."uid"()) OR "public"."has_role"("auth"."uid"(), 'admin'::"text") OR "public"."has_role"("auth"."uid"(), 'gerente'::"text")));



CREATE POLICY "Finance and admins can view clients" ON "public"."clients" FOR SELECT TO "authenticated" USING (("public"."is_financeiro"("auth"."uid"()) OR "public"."has_role"("auth"."uid"(), 'admin'::"text") OR "public"."has_role"("auth"."uid"(), 'gerente'::"text")));



CREATE POLICY "Finance roles full access expenses" ON "public"."expenses" TO "authenticated" USING (("public"."has_role"("auth"."uid"(), 'admin'::"text") OR "public"."has_role"("auth"."uid"(), 'socio'::"text") OR "public"."has_role"("auth"."uid"(), 'gerente'::"text") OR "public"."has_role"("auth"."uid"(), 'financeiro'::"text") OR "public"."has_role"("auth"."uid"(), 'assistente_financeiro'::"text"))) WITH CHECK (("public"."has_role"("auth"."uid"(), 'admin'::"text") OR "public"."has_role"("auth"."uid"(), 'socio'::"text") OR "public"."has_role"("auth"."uid"(), 'gerente'::"text") OR "public"."has_role"("auth"."uid"(), 'financeiro'::"text") OR "public"."has_role"("auth"."uid"(), 'assistente_financeiro'::"text")));



CREATE POLICY "Finance roles full access invoices" ON "public"."invoices" TO "authenticated" USING (("public"."has_role"("auth"."uid"(), 'admin'::"text") OR "public"."has_role"("auth"."uid"(), 'socio'::"text") OR "public"."has_role"("auth"."uid"(), 'gerente'::"text") OR "public"."has_role"("auth"."uid"(), 'financeiro'::"text") OR "public"."has_role"("auth"."uid"(), 'assistente_financeiro'::"text"))) WITH CHECK (("public"."has_role"("auth"."uid"(), 'admin'::"text") OR "public"."has_role"("auth"."uid"(), 'socio'::"text") OR "public"."has_role"("auth"."uid"(), 'gerente'::"text") OR "public"."has_role"("auth"."uid"(), 'financeiro'::"text") OR "public"."has_role"("auth"."uid"(), 'assistente_financeiro'::"text")));



CREATE POLICY "Financeiro and admins can manage billing_provisions" ON "public"."billing_provisions" TO "authenticated" USING (("public"."is_financeiro"("auth"."uid"()) OR "public"."is_admin_or_manager"("auth"."uid"())));



CREATE POLICY "Financeiro and leaders can insert accounts" ON "public"."accounts" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_leader_or_above"("auth"."uid"()) OR "public"."is_financeiro"("auth"."uid"())));



CREATE POLICY "Financeiro and leaders can insert bank_statement_entries" ON "public"."bank_statement_entries" FOR INSERT WITH CHECK (("public"."is_leader_or_above"("auth"."uid"()) OR "public"."is_financeiro"("auth"."uid"())));



CREATE POLICY "Financeiro and leaders can insert bank_statements" ON "public"."bank_statements" FOR INSERT WITH CHECK (("public"."is_leader_or_above"("auth"."uid"()) OR "public"."is_financeiro"("auth"."uid"())));



CREATE POLICY "Financeiro and leaders can insert expense_splits" ON "public"."expense_splits" FOR INSERT WITH CHECK (("public"."is_leader_or_above"("auth"."uid"()) OR "public"."is_financeiro"("auth"."uid"())));



CREATE POLICY "Financeiro and leaders can insert expenses" ON "public"."expenses" FOR INSERT WITH CHECK (("public"."is_leader_or_above"("auth"."uid"()) OR "public"."is_financeiro"("auth"."uid"())));



CREATE POLICY "Financeiro and leaders can insert nfse_config" ON "public"."nfse_config" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_financeiro"("auth"."uid"()) OR "public"."has_role"("auth"."uid"(), 'admin'::"text")));



CREATE POLICY "Financeiro and leaders can insert treasury_entries" ON "public"."treasury_entries" FOR INSERT WITH CHECK (("public"."is_leader_or_above"("auth"."uid"()) OR "public"."is_financeiro"("auth"."uid"())));



CREATE POLICY "Financeiro and leaders can update accounts" ON "public"."accounts" FOR UPDATE TO "authenticated" USING (("public"."is_leader_or_above"("auth"."uid"()) OR "public"."is_financeiro"("auth"."uid"())));



CREATE POLICY "Financeiro and leaders can update bank_statement_entries" ON "public"."bank_statement_entries" FOR UPDATE USING (("public"."is_leader_or_above"("auth"."uid"()) OR "public"."is_financeiro"("auth"."uid"())));



CREATE POLICY "Financeiro and leaders can update bank_statements" ON "public"."bank_statements" FOR UPDATE USING (("public"."is_leader_or_above"("auth"."uid"()) OR "public"."is_financeiro"("auth"."uid"())));



CREATE POLICY "Financeiro and leaders can update expense_splits" ON "public"."expense_splits" FOR UPDATE USING (("public"."is_leader_or_above"("auth"."uid"()) OR "public"."is_financeiro"("auth"."uid"())));



CREATE POLICY "Financeiro and leaders can update expenses" ON "public"."expenses" FOR UPDATE USING (("public"."is_leader_or_above"("auth"."uid"()) OR "public"."is_financeiro"("auth"."uid"())));



CREATE POLICY "Financeiro and leaders can update nfse_config" ON "public"."nfse_config" FOR UPDATE TO "authenticated" USING (("public"."is_financeiro"("auth"."uid"()) OR "public"."has_role"("auth"."uid"(), 'admin'::"text")));



CREATE POLICY "Financeiro and leaders can update treasury_entries" ON "public"."treasury_entries" FOR UPDATE USING (("public"."is_leader_or_above"("auth"."uid"()) OR "public"."is_financeiro"("auth"."uid"())));



CREATE POLICY "Financeiro and leaders can view bank_statement_entries" ON "public"."bank_statement_entries" FOR SELECT USING (("public"."is_leader_or_above"("auth"."uid"()) OR "public"."is_financeiro"("auth"."uid"())));



CREATE POLICY "Financeiro and leaders can view bank_statements" ON "public"."bank_statements" FOR SELECT USING (("public"."is_leader_or_above"("auth"."uid"()) OR "public"."is_financeiro"("auth"."uid"())));



CREATE POLICY "Financeiro and leaders can view expense_splits" ON "public"."expense_splits" FOR SELECT USING (("public"."is_leader_or_above"("auth"."uid"()) OR "public"."is_financeiro"("auth"."uid"())));



CREATE POLICY "Financeiro and leaders can view expenses" ON "public"."expenses" FOR SELECT USING (("public"."is_leader_or_above"("auth"."uid"()) OR "public"."is_financeiro"("auth"."uid"())));



CREATE POLICY "Financeiro and leaders can view financial_groups" ON "public"."financial_groups" FOR SELECT USING (("public"."is_leader_or_above"("auth"."uid"()) OR "public"."is_financeiro"("auth"."uid"())));



CREATE POLICY "Financeiro and leaders can view nfse_config" ON "public"."nfse_config" FOR SELECT TO "authenticated" USING (("public"."is_leader_or_above"("auth"."uid"()) OR "public"."is_financeiro"("auth"."uid"())));



CREATE POLICY "Financeiro and leaders can view treasury_entries" ON "public"."treasury_entries" FOR SELECT USING (("public"."is_leader_or_above"("auth"."uid"()) OR "public"."is_financeiro"("auth"."uid"())));



CREATE POLICY "Leaders and above can delete client_branches" ON "public"."client_branches" FOR DELETE TO "authenticated" USING ("public"."is_leader_or_above"("auth"."uid"()));



CREATE POLICY "Leaders and above can insert agent executions" ON "public"."agent_executions" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_leader_or_above"("auth"."uid"()));



CREATE POLICY "Leaders and above can insert client documents" ON "public"."client_documents" FOR INSERT WITH CHECK ("public"."is_leader_or_above"("auth"."uid"()));



CREATE POLICY "Leaders and above can insert client_aliases" ON "public"."client_aliases" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_leader_or_above"("auth"."uid"()));



CREATE POLICY "Leaders and above can insert client_branches" ON "public"."client_branches" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_leader_or_above"("auth"."uid"()));



CREATE POLICY "Leaders and above can insert clients" ON "public"."clients" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_leader_or_above"("auth"."uid"()));



CREATE POLICY "Leaders and above can insert contacts" ON "public"."client_contacts" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_leader_or_above"("auth"."uid"()));



CREATE POLICY "Leaders and above can insert contract_keys" ON "public"."contract_keys" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_leader_or_above"("auth"."uid"()));



CREATE POLICY "Leaders and above can insert deadlines" ON "public"."process_deadlines" FOR INSERT WITH CHECK ("public"."is_leader_or_above"("auth"."uid"()));



CREATE POLICY "Leaders and above can insert economic_groups" ON "public"."economic_groups" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_leader_or_above"("auth"."uid"()));



CREATE POLICY "Leaders and above can insert extractions" ON "public"."contract_extractions" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_leader_or_above"("auth"."uid"()));



CREATE POLICY "Leaders and above can insert processed files" ON "public"."processed_files" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_leader_or_above"("auth"."uid"()));



CREATE POLICY "Leaders and above can insert processes" ON "public"."processes" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_leader_or_above"("auth"."uid"()));



CREATE POLICY "Leaders and above can insert related processes" ON "public"."related_processes" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_leader_or_above"("auth"."uid"()));



CREATE POLICY "Leaders and above can insert team_clients" ON "public"."team_clients" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_leader_or_above"("auth"."uid"()));



CREATE POLICY "Leaders and above can update agent executions" ON "public"."agent_executions" FOR UPDATE TO "authenticated" USING ("public"."is_leader_or_above"("auth"."uid"()));



CREATE POLICY "Leaders and above can update client documents" ON "public"."client_documents" FOR UPDATE USING ("public"."is_leader_or_above"("auth"."uid"()));



CREATE POLICY "Leaders and above can update client_branches" ON "public"."client_branches" FOR UPDATE TO "authenticated" USING ("public"."is_leader_or_above"("auth"."uid"()));



CREATE POLICY "Leaders and above can update clients" ON "public"."clients" FOR UPDATE TO "authenticated" USING ("public"."is_leader_or_above"("auth"."uid"()));



CREATE POLICY "Leaders and above can update contacts" ON "public"."client_contacts" FOR UPDATE TO "authenticated" USING ("public"."is_leader_or_above"("auth"."uid"()));



CREATE POLICY "Leaders and above can update contract_keys" ON "public"."contract_keys" FOR UPDATE TO "authenticated" USING ("public"."is_leader_or_above"("auth"."uid"()));



CREATE POLICY "Leaders and above can update deadlines" ON "public"."process_deadlines" FOR UPDATE USING ("public"."is_leader_or_above"("auth"."uid"()));



CREATE POLICY "Leaders and above can update economic_groups" ON "public"."economic_groups" FOR UPDATE TO "authenticated" USING ("public"."is_leader_or_above"("auth"."uid"()));



CREATE POLICY "Leaders and above can update extractions" ON "public"."contract_extractions" FOR UPDATE TO "authenticated" USING ("public"."is_leader_or_above"("auth"."uid"()));



CREATE POLICY "Leaders and above can update processed files" ON "public"."processed_files" FOR UPDATE TO "authenticated" USING ("public"."is_leader_or_above"("auth"."uid"()));



CREATE POLICY "Leaders and above can update processes" ON "public"."processes" FOR UPDATE TO "authenticated" USING ("public"."is_leader_or_above"("auth"."uid"()));



CREATE POLICY "Leaders and above can update related processes" ON "public"."related_processes" FOR UPDATE TO "authenticated" USING ("public"."is_leader_or_above"("auth"."uid"()));



CREATE POLICY "Leaders and above can update team_clients" ON "public"."team_clients" FOR UPDATE TO "authenticated" USING ("public"."is_leader_or_above"("auth"."uid"()));



CREATE POLICY "Leaders and finance can view contract_pricing" ON "public"."contract_pricing" FOR SELECT TO "authenticated" USING (("public"."is_leader_or_above"("auth"."uid"()) OR "public"."is_financeiro"("auth"."uid"()) OR "public"."is_coordinator_or_above"("auth"."uid"())));



CREATE POLICY "Leaders can delete entries" ON "public"."timesheet_entries" FOR DELETE USING ("public"."is_leader_or_above"("auth"."uid"()));



CREATE POLICY "Leaders can delete requests" ON "public"."solicitacoes" FOR DELETE USING ("public"."is_leader_or_above"("auth"."uid"()));



CREATE POLICY "Leaders can insert calculation_types" ON "public"."calculation_types" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_leader_or_above"("auth"."uid"()));



CREATE POLICY "Leaders can insert client_sla_rules" ON "public"."client_sla_rules" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_leader_or_above"("auth"."uid"()));



CREATE POLICY "Leaders can insert contract_pricing" ON "public"."contract_pricing" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_leader_or_above"("auth"."uid"()));



CREATE POLICY "Leaders can insert historico_axis" ON "public"."historico_axis" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_leader_or_above"("auth"."uid"()));



CREATE POLICY "Leaders can insert pautas" ON "public"."pautas_unificadas" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_leader_or_above"("auth"."uid"()));



CREATE POLICY "Leaders can insert requests" ON "public"."solicitacoes" FOR INSERT WITH CHECK ("public"."is_leader_or_above"("auth"."uid"()));



CREATE POLICY "Leaders can insert user_aliases" ON "public"."user_aliases" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_leader_or_above"("auth"."uid"()));



CREATE POLICY "Leaders can manage processing_logs" ON "public"."processing_logs" TO "authenticated" USING ("public"."is_leader_or_above"("auth"."uid"()));



CREATE POLICY "Leaders can manage sync_logs" ON "public"."sync_logs" USING ("public"."is_leader_or_above"("auth"."uid"()));



CREATE POLICY "Leaders can update calculation_types" ON "public"."calculation_types" FOR UPDATE TO "authenticated" USING ("public"."is_leader_or_above"("auth"."uid"()));



CREATE POLICY "Leaders can update client_sla_rules" ON "public"."client_sla_rules" FOR UPDATE TO "authenticated" USING ("public"."is_leader_or_above"("auth"."uid"()));



CREATE POLICY "Leaders can update contract_pricing" ON "public"."contract_pricing" FOR UPDATE TO "authenticated" USING ("public"."is_leader_or_above"("auth"."uid"()));



CREATE POLICY "Leaders can update historico_axis" ON "public"."historico_axis" FOR UPDATE TO "authenticated" USING ("public"."is_leader_or_above"("auth"."uid"()));



CREATE POLICY "Leaders can update pautas" ON "public"."pautas_unificadas" FOR UPDATE TO "authenticated" USING ("public"."is_leader_or_above"("auth"."uid"()));



CREATE POLICY "Leaders can update requests" ON "public"."solicitacoes" FOR UPDATE USING ("public"."is_leader_or_above"("auth"."uid"()));



CREATE POLICY "Leaders can update user_aliases" ON "public"."user_aliases" FOR UPDATE TO "authenticated" USING ("public"."is_leader_or_above"("auth"."uid"()));



CREATE POLICY "Leaders can view all entries" ON "public"."timesheet_entries" FOR SELECT USING ("public"."is_leader_or_above"("auth"."uid"()));



CREATE POLICY "Only admins can delete accounts" ON "public"."accounts" FOR DELETE TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"text"));



CREATE POLICY "Only admins can delete agent executions" ON "public"."agent_executions" FOR DELETE TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"text"));



CREATE POLICY "Only admins can delete bank_accounts_config" ON "public"."bank_accounts_config" FOR DELETE TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"text"));



CREATE POLICY "Only admins can delete bank_statement_entries" ON "public"."bank_statement_entries" FOR DELETE USING ("public"."has_role"("auth"."uid"(), 'admin'::"text"));



CREATE POLICY "Only admins can delete bank_statements" ON "public"."bank_statements" FOR DELETE USING ("public"."has_role"("auth"."uid"(), 'admin'::"text"));



CREATE POLICY "Only admins can delete billing contacts" ON "public"."billing_contacts" FOR DELETE TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"text"));



CREATE POLICY "Only admins can delete billing_preview_items" ON "public"."billing_preview_items" FOR DELETE TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"text"));



CREATE POLICY "Only admins can delete billing_previews" ON "public"."billing_previews" FOR DELETE TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"text"));



CREATE POLICY "Only admins can delete bonus" ON "public"."bonus_calculations" FOR DELETE USING ("public"."has_role"("auth"."uid"(), 'admin'::"text"));



CREATE POLICY "Only admins can delete branches" ON "public"."branches" FOR DELETE USING ("public"."has_role"("auth"."uid"(), 'admin'::"text"));



CREATE POLICY "Only admins can delete calculation_types" ON "public"."calculation_types" FOR DELETE TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"text"));



CREATE POLICY "Only admins can delete client documents" ON "public"."client_documents" FOR DELETE USING ("public"."has_role"("auth"."uid"(), 'admin'::"text"));



CREATE POLICY "Only admins can delete client_aliases" ON "public"."client_aliases" FOR DELETE TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"text"));



CREATE POLICY "Only admins can delete client_sla_rules" ON "public"."client_sla_rules" FOR DELETE USING ("public"."has_role"("auth"."uid"(), 'admin'::"text"));



CREATE POLICY "Only admins can delete clients" ON "public"."clients" FOR DELETE TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"text"));



CREATE POLICY "Only admins can delete company_entities" ON "public"."company_entities" FOR DELETE USING ("public"."has_role"("auth"."uid"(), 'admin'::"text"));



CREATE POLICY "Only admins can delete contacts" ON "public"."client_contacts" FOR DELETE USING ("public"."has_role"("auth"."uid"(), 'admin'::"text"));



CREATE POLICY "Only admins can delete contract_keys" ON "public"."contract_keys" FOR DELETE TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"text"));



CREATE POLICY "Only admins can delete contract_pricing" ON "public"."contract_pricing" FOR DELETE TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"text"));



CREATE POLICY "Only admins can delete cost_centers" ON "public"."cost_centers" FOR DELETE USING ("public"."has_role"("auth"."uid"(), 'admin'::"text"));



CREATE POLICY "Only admins can delete custom_roles" ON "public"."custom_roles" FOR DELETE TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"text"));



CREATE POLICY "Only admins can delete deadlines" ON "public"."process_deadlines" FOR DELETE USING ("public"."has_role"("auth"."uid"(), 'admin'::"text"));



CREATE POLICY "Only admins can delete economic_groups" ON "public"."economic_groups" FOR DELETE TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"text"));



CREATE POLICY "Only admins can delete expense_splits" ON "public"."expense_splits" FOR DELETE USING ("public"."has_role"("auth"."uid"(), 'admin'::"text"));



CREATE POLICY "Only admins can delete expenses" ON "public"."expenses" FOR DELETE USING ("public"."has_role"("auth"."uid"(), 'admin'::"text"));



CREATE POLICY "Only admins can delete extractions" ON "public"."contract_extractions" FOR DELETE TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"text"));



CREATE POLICY "Only admins can delete financial_groups" ON "public"."financial_groups" FOR DELETE USING ("public"."has_role"("auth"."uid"(), 'admin'::"text"));



CREATE POLICY "Only admins can delete historico_axis" ON "public"."historico_axis" FOR DELETE TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"text"));



CREATE POLICY "Only admins can delete monitored_emails" ON "public"."monitored_emails" FOR DELETE TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"text"));



CREATE POLICY "Only admins can delete nfse_config" ON "public"."nfse_config" FOR DELETE TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"text"));



CREATE POLICY "Only admins can delete overrides" ON "public"."user_permission_overrides" FOR DELETE USING ("public"."has_role"("auth"."uid"(), 'admin'::"text"));



CREATE POLICY "Only admins can delete pautas" ON "public"."pautas_unificadas" FOR DELETE TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"text"));



CREATE POLICY "Only admins can delete processed files" ON "public"."processed_files" FOR DELETE TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"text"));



CREATE POLICY "Only admins can delete processes" ON "public"."processes" FOR DELETE TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"text"));



CREATE POLICY "Only admins can delete related processes" ON "public"."related_processes" FOR DELETE TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"text"));



CREATE POLICY "Only admins can delete role_permissions" ON "public"."role_permissions" FOR DELETE USING ("public"."has_role"("auth"."uid"(), 'admin'::"text"));



CREATE POLICY "Only admins can delete roles" ON "public"."user_roles" FOR DELETE USING ("public"."has_role"("auth"."uid"(), 'admin'::"text"));



CREATE POLICY "Only admins can delete team_clients" ON "public"."team_clients" FOR DELETE TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"text"));



CREATE POLICY "Only admins can delete treasury_entries" ON "public"."treasury_entries" FOR DELETE USING ("public"."has_role"("auth"."uid"(), 'admin'::"text"));



CREATE POLICY "Only admins can delete user_aliases" ON "public"."user_aliases" FOR DELETE TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"text"));



CREATE POLICY "Only admins can insert bank_accounts_config" ON "public"."bank_accounts_config" FOR INSERT TO "authenticated" WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"text"));



CREATE POLICY "Only admins can insert branches" ON "public"."branches" FOR INSERT WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"text"));



CREATE POLICY "Only admins can insert company_entities" ON "public"."company_entities" FOR INSERT WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"text"));



CREATE POLICY "Only admins can insert cost_centers" ON "public"."cost_centers" FOR INSERT WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"text"));



CREATE POLICY "Only admins can insert financial_groups" ON "public"."financial_groups" FOR INSERT WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"text"));



CREATE POLICY "Only admins can insert monitored_emails" ON "public"."monitored_emails" FOR INSERT TO "authenticated" WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"text"));



CREATE POLICY "Only admins can insert overrides" ON "public"."user_permission_overrides" FOR INSERT WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"text"));



CREATE POLICY "Only admins can insert role_permissions" ON "public"."role_permissions" FOR INSERT WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"text"));



CREATE POLICY "Only admins can insert roles" ON "public"."user_roles" FOR INSERT WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"text"));



CREATE POLICY "Only admins can manage activity types" ON "public"."activity_types" USING ("public"."has_role"("auth"."uid"(), 'admin'::"text"));



CREATE POLICY "Only admins can manage area goals" ON "public"."area_goals" USING ("public"."has_role"("auth"."uid"(), 'admin'::"text"));



CREATE POLICY "Only admins can update bank_accounts_config" ON "public"."bank_accounts_config" FOR UPDATE TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"text"));



CREATE POLICY "Only admins can update branches" ON "public"."branches" FOR UPDATE USING ("public"."has_role"("auth"."uid"(), 'admin'::"text"));



CREATE POLICY "Only admins can update company_entities" ON "public"."company_entities" FOR UPDATE USING ("public"."has_role"("auth"."uid"(), 'admin'::"text"));



CREATE POLICY "Only admins can update cost_centers" ON "public"."cost_centers" FOR UPDATE USING ("public"."has_role"("auth"."uid"(), 'admin'::"text"));



CREATE POLICY "Only admins can update financial_groups" ON "public"."financial_groups" FOR UPDATE USING ("public"."has_role"("auth"."uid"(), 'admin'::"text"));



CREATE POLICY "Only admins can update monitored_emails" ON "public"."monitored_emails" FOR UPDATE TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"text"));



CREATE POLICY "Only admins can update overrides" ON "public"."user_permission_overrides" FOR UPDATE USING ("public"."has_role"("auth"."uid"(), 'admin'::"text"));



CREATE POLICY "Only admins can update role_permissions" ON "public"."role_permissions" FOR UPDATE USING ("public"."has_role"("auth"."uid"(), 'admin'::"text"));



CREATE POLICY "Only admins can update roles" ON "public"."user_roles" FOR UPDATE USING ("public"."has_role"("auth"."uid"(), 'admin'::"text"));



CREATE POLICY "Users can insert their own entries" ON "public"."timesheet_entries" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own profile" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own requests" ON "public"."solicitacoes" FOR INSERT WITH CHECK (("auth"."uid"() = "created_by"));



CREATE POLICY "Users can manage own events" ON "public"."calendar_events" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own entries" ON "public"."timesheet_entries" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view assigned or leader requests" ON "public"."solicitacoes" FOR SELECT TO "authenticated" USING ((("auth"."uid"() = "assigned_to") OR "public"."is_leader_or_above"("auth"."uid"())));



CREATE POLICY "Users can view own bonus" ON "public"."bonus_calculations" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own created requests" ON "public"."solicitacoes" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "created_by"));



CREATE POLICY "Users can view own overrides or admins view all" ON "public"."user_permission_overrides" FOR SELECT TO "authenticated" USING (("public"."has_role"("auth"."uid"(), 'admin'::"text") OR ("user_id" = "auth"."uid"())));



CREATE POLICY "Users can view own roles" ON "public"."user_roles" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own audit logs" ON "public"."audit_logs" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own bonus_provisions" ON "public"."bonus_provisions" FOR SELECT TO "authenticated" USING ((("auth"."uid"() = "user_id") OR "public"."is_admin_or_manager"("auth"."uid"())));



CREATE POLICY "Users can view their own entries" ON "public"."timesheet_entries" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own roles" ON "public"."user_roles" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."access_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."accounts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."activity_types" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."agent_executions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."area_goals" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."authorized_email_domains" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."bank_accounts_config" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."bank_statement_entries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."bank_statements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."banks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."billing_contacts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."billing_preview_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."billing_previews" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."billing_provisions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."boletos" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "boletos_delete" ON "public"."boletos" FOR DELETE USING ("public"."has_role"("auth"."uid"(), 'admin'::"text"));



CREATE POLICY "boletos_insert" ON "public"."boletos" FOR INSERT WITH CHECK (("public"."is_financeiro"("auth"."uid"()) OR "public"."is_leader_or_above"("auth"."uid"()) OR "public"."has_role"("auth"."uid"(), 'admin'::"text")));



CREATE POLICY "boletos_select" ON "public"."boletos" FOR SELECT USING (("public"."is_financeiro"("auth"."uid"()) OR "public"."is_leader_or_above"("auth"."uid"()) OR "public"."has_role"("auth"."uid"(), 'admin'::"text")));



CREATE POLICY "boletos_update" ON "public"."boletos" FOR UPDATE USING (("public"."is_financeiro"("auth"."uid"()) OR "public"."is_leader_or_above"("auth"."uid"()) OR "public"."has_role"("auth"."uid"(), 'admin'::"text")));



ALTER TABLE "public"."bonus_calculations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."bonus_provisions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."branches" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."calculation_types" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."calendar_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."chart_of_accounts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "chart_of_accounts_delete" ON "public"."chart_of_accounts" FOR DELETE USING ("public"."has_role"("auth"."uid"(), 'admin'::"text"));



CREATE POLICY "chart_of_accounts_insert" ON "public"."chart_of_accounts" FOR INSERT WITH CHECK (("public"."is_financeiro"("auth"."uid"()) OR "public"."is_leader_or_above"("auth"."uid"()) OR "public"."has_role"("auth"."uid"(), 'admin'::"text")));



CREATE POLICY "chart_of_accounts_select" ON "public"."chart_of_accounts" FOR SELECT USING (("public"."is_financeiro"("auth"."uid"()) OR "public"."is_leader_or_above"("auth"."uid"()) OR "public"."has_role"("auth"."uid"(), 'admin'::"text")));



CREATE POLICY "chart_of_accounts_update" ON "public"."chart_of_accounts" FOR UPDATE USING (("public"."is_financeiro"("auth"."uid"()) OR "public"."is_leader_or_above"("auth"."uid"()) OR "public"."has_role"("auth"."uid"(), 'admin'::"text")));



ALTER TABLE "public"."client_aliases" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."client_branches" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."client_contacts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."client_documents" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."client_sla_rules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."clients" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."company_entities" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."contract_extractions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."contract_keys" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."contract_pricing" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cost_centers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."custom_roles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."economic_groups" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."expense_splits" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."expenses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."financial_groups" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."historico_axis" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."invoices" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."monitored_emails" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."nfse_config" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pautas_unificadas" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."permissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."phase_area_mapping" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."process_deadlines" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."processed_files" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."processes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."processing_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."related_processes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."role_permissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."solicitacoes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sync_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tax_rules" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tax_rules_delete" ON "public"."tax_rules" FOR DELETE USING ("public"."has_role"("auth"."uid"(), 'admin'::"text"));



CREATE POLICY "tax_rules_insert" ON "public"."tax_rules" FOR INSERT WITH CHECK (("public"."is_financeiro"("auth"."uid"()) OR "public"."is_leader_or_above"("auth"."uid"()) OR "public"."has_role"("auth"."uid"(), 'admin'::"text")));



CREATE POLICY "tax_rules_select" ON "public"."tax_rules" FOR SELECT USING (("public"."is_financeiro"("auth"."uid"()) OR "public"."is_leader_or_above"("auth"."uid"()) OR "public"."has_role"("auth"."uid"(), 'admin'::"text")));



CREATE POLICY "tax_rules_update" ON "public"."tax_rules" FOR UPDATE USING (("public"."is_financeiro"("auth"."uid"()) OR "public"."is_leader_or_above"("auth"."uid"()) OR "public"."has_role"("auth"."uid"(), 'admin'::"text")));



ALTER TABLE "public"."team_clients" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."timesheet_entries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."treasury_entries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_aliases" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_permission_overrides" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_roles" ENABLE ROW LEVEL SECURITY;


REVOKE USAGE ON SCHEMA "public" FROM PUBLIC;
GRANT ALL ON SCHEMA "public" TO PUBLIC;



GRANT ALL ON FUNCTION "public"."is_email_domain_authorized"("p_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."is_email_domain_authorized"("p_email" "text") TO "authenticated";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."access_logs" TO "authenticated";
GRANT SELECT ON TABLE "public"."access_logs" TO "anon";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."accounts" TO "authenticated";
GRANT SELECT ON TABLE "public"."accounts" TO "anon";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."activity_types" TO "authenticated";
GRANT SELECT ON TABLE "public"."activity_types" TO "anon";
GRANT SELECT ON TABLE "public"."activity_types" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."agent_executions" TO "authenticated";
GRANT SELECT ON TABLE "public"."agent_executions" TO "anon";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."area_goals" TO "authenticated";
GRANT SELECT ON TABLE "public"."area_goals" TO "anon";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."audit_logs" TO "authenticated";
GRANT SELECT ON TABLE "public"."audit_logs" TO "anon";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."bank_accounts_config" TO "authenticated";
GRANT SELECT ON TABLE "public"."bank_accounts_config" TO "anon";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."bank_statement_entries" TO "authenticated";
GRANT SELECT ON TABLE "public"."bank_statement_entries" TO "anon";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."bank_statements" TO "authenticated";
GRANT SELECT ON TABLE "public"."bank_statements" TO "anon";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."banks" TO "authenticated";
GRANT SELECT ON TABLE "public"."banks" TO "anon";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."billing_contacts" TO "authenticated";
GRANT SELECT ON TABLE "public"."billing_contacts" TO "anon";



GRANT ALL ON TABLE "public"."billing_provisions" TO "service_role";
GRANT ALL ON TABLE "public"."billing_provisions" TO "authenticated";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."boletos" TO "authenticated";
GRANT SELECT ON TABLE "public"."boletos" TO "anon";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."bonus_calculations" TO "authenticated";
GRANT SELECT ON TABLE "public"."bonus_calculations" TO "anon";



GRANT ALL ON TABLE "public"."bonus_provisions" TO "service_role";
GRANT ALL ON TABLE "public"."bonus_provisions" TO "authenticated";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."branches" TO "authenticated";
GRANT SELECT ON TABLE "public"."branches" TO "anon";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."calculation_types" TO "authenticated";
GRANT SELECT ON TABLE "public"."calculation_types" TO "anon";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."calendar_events" TO "authenticated";
GRANT SELECT ON TABLE "public"."calendar_events" TO "anon";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."chart_of_accounts" TO "authenticated";
GRANT SELECT ON TABLE "public"."chart_of_accounts" TO "anon";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."client_aliases" TO "authenticated";
GRANT SELECT ON TABLE "public"."client_aliases" TO "anon";
GRANT ALL ON TABLE "public"."client_aliases" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."client_branches" TO "authenticated";
GRANT SELECT ON TABLE "public"."client_branches" TO "anon";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."client_contacts" TO "authenticated";
GRANT SELECT ON TABLE "public"."client_contacts" TO "anon";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."client_documents" TO "authenticated";
GRANT SELECT ON TABLE "public"."client_documents" TO "anon";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."client_sla_rules" TO "authenticated";
GRANT SELECT ON TABLE "public"."client_sla_rules" TO "anon";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."clients" TO "authenticated";
GRANT SELECT ON TABLE "public"."clients" TO "anon";
GRANT ALL ON TABLE "public"."clients" TO "service_role";



GRANT SELECT ON TABLE "public"."clients_safe" TO "authenticated";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."company_entities" TO "authenticated";
GRANT SELECT ON TABLE "public"."company_entities" TO "anon";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."contract_extractions" TO "authenticated";
GRANT SELECT ON TABLE "public"."contract_extractions" TO "anon";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."contract_keys" TO "authenticated";
GRANT SELECT ON TABLE "public"."contract_keys" TO "anon";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."contract_pricing" TO "authenticated";
GRANT SELECT ON TABLE "public"."contract_pricing" TO "anon";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."cost_centers" TO "authenticated";
GRANT SELECT ON TABLE "public"."cost_centers" TO "anon";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."custom_roles" TO "authenticated";
GRANT SELECT ON TABLE "public"."custom_roles" TO "anon";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."economic_groups" TO "authenticated";
GRANT SELECT ON TABLE "public"."economic_groups" TO "anon";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."expense_splits" TO "authenticated";
GRANT SELECT ON TABLE "public"."expense_splits" TO "anon";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."expenses" TO "authenticated";
GRANT SELECT ON TABLE "public"."expenses" TO "anon";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."financial_groups" TO "authenticated";
GRANT SELECT ON TABLE "public"."financial_groups" TO "anon";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."historico_axis" TO "authenticated";
GRANT SELECT ON TABLE "public"."historico_axis" TO "anon";
GRANT SELECT ON TABLE "public"."historico_axis" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."invoices" TO "authenticated";
GRANT SELECT ON TABLE "public"."invoices" TO "anon";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."monitored_emails" TO "authenticated";
GRANT SELECT ON TABLE "public"."monitored_emails" TO "anon";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."nfse_config" TO "authenticated";
GRANT SELECT ON TABLE "public"."nfse_config" TO "anon";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."pautas_unificadas" TO "authenticated";
GRANT SELECT ON TABLE "public"."pautas_unificadas" TO "anon";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."permissions" TO "authenticated";
GRANT SELECT ON TABLE "public"."permissions" TO "anon";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."phase_area_mapping" TO "authenticated";
GRANT SELECT ON TABLE "public"."phase_area_mapping" TO "anon";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."process_deadlines" TO "authenticated";
GRANT SELECT ON TABLE "public"."process_deadlines" TO "anon";
GRANT ALL ON TABLE "public"."process_deadlines" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."processed_files" TO "authenticated";
GRANT SELECT ON TABLE "public"."processed_files" TO "anon";



GRANT SELECT,USAGE ON SEQUENCE "public"."processes_numero_pasta_seq" TO "authenticated";
GRANT SELECT,USAGE ON SEQUENCE "public"."processes_numero_pasta_seq" TO "anon";
GRANT SELECT,USAGE ON SEQUENCE "public"."processes_numero_pasta_seq" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."processes" TO "authenticated";
GRANT SELECT ON TABLE "public"."processes" TO "anon";
GRANT ALL ON TABLE "public"."processes" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."processing_logs" TO "authenticated";
GRANT SELECT ON TABLE "public"."processing_logs" TO "anon";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."profiles" TO "authenticated";
GRANT SELECT ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT SELECT ON TABLE "public"."profiles_safe" TO "authenticated";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."related_processes" TO "authenticated";
GRANT SELECT ON TABLE "public"."related_processes" TO "anon";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."role_permissions" TO "authenticated";
GRANT SELECT ON TABLE "public"."role_permissions" TO "anon";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."solicitacoes" TO "authenticated";
GRANT SELECT ON TABLE "public"."solicitacoes" TO "anon";
GRANT ALL ON TABLE "public"."solicitacoes" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."sync_logs" TO "authenticated";
GRANT SELECT ON TABLE "public"."sync_logs" TO "anon";
GRANT ALL ON TABLE "public"."sync_logs" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."tax_rules" TO "authenticated";
GRANT SELECT ON TABLE "public"."tax_rules" TO "anon";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."team_clients" TO "authenticated";
GRANT SELECT ON TABLE "public"."team_clients" TO "anon";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."timesheet_entries" TO "authenticated";
GRANT SELECT ON TABLE "public"."timesheet_entries" TO "anon";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."timesheet_entries" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."treasury_entries" TO "authenticated";
GRANT SELECT ON TABLE "public"."treasury_entries" TO "anon";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."user_aliases" TO "authenticated";
GRANT SELECT ON TABLE "public"."user_aliases" TO "anon";
GRANT ALL ON TABLE "public"."user_aliases" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."user_permission_overrides" TO "authenticated";
GRANT SELECT ON TABLE "public"."user_permission_overrides" TO "anon";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."user_roles" TO "authenticated";
GRANT SELECT ON TABLE "public"."user_roles" TO "anon";




