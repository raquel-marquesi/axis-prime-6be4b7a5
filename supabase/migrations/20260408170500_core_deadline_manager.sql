-- Migration: Core Deadline Manager
-- Substitui lógicas fragmentadas nas Edge Functions por RPCs seguras usando PostgreSQL.

CREATE OR REPLACE FUNCTION public.core_create_deadline(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
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


-- Lógica Simplificada de Baixa solicitada pela UX
CREATE OR REPLACE FUNCTION public.core_complete_deadline(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
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
