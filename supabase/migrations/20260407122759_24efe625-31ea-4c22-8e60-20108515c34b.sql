
-- 1. Fix reconcile_open_deadlines: add p_batch_size parameter
CREATE OR REPLACE FUNCTION public.reconcile_open_deadlines(p_batch_size integer DEFAULT 1000)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
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
$function$;

-- 2. Fix relink_orphan_timesheet_entries: add p_batch_size parameter
CREATE OR REPLACE FUNCTION public.relink_orphan_timesheet_entries(p_batch_size integer DEFAULT 1000)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
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
$function$;

-- 3. Drop legacy overloads with text signatures
DROP FUNCTION IF EXISTS public.get_prazos_rows(text, uuid, integer, integer, text, text[]);
DROP FUNCTION IF EXISTS public.get_prazos_summary(text, uuid);
