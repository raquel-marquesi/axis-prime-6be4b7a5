
DO $$
DECLARE
  v_deleted_deadlines int := 0;
  v_deleted_calendar int := 0;
  v_reparented_solicitacoes int := 0;
  v_reparented_timesheet int := 0;
  v_deleted_processes int := 0;
BEGIN
  CREATE TEMP TABLE canonical_processes AS
  SELECT DISTINCT ON (numero_processo)
    id AS canonical_id, numero_processo
  FROM processes
  WHERE numero_processo IN (
    SELECT numero_processo FROM processes GROUP BY numero_processo HAVING count(*) > 1
  )
  ORDER BY numero_processo, created_at ASC;

  CREATE TEMP TABLE duplicate_processes AS
  SELECT p.id AS dup_id, cp.canonical_id
  FROM processes p
  JOIN canonical_processes cp ON p.numero_processo = cp.numero_processo AND p.id != cp.canonical_id;

  -- Delete calendar events linked to deadlines of duplicate processes
  DELETE FROM calendar_events ce
  WHERE ce.process_deadline_id IN (
    SELECT pd.id FROM process_deadlines pd
    JOIN duplicate_processes dp ON pd.process_id = dp.dup_id
  );
  GET DIAGNOSTICS v_deleted_calendar = ROW_COUNT;

  -- Delete ALL deadlines from duplicate processes (canonical already has the originals)
  DELETE FROM process_deadlines pd
  USING duplicate_processes dp
  WHERE pd.process_id = dp.dup_id;
  GET DIAGNOSTICS v_deleted_deadlines = ROW_COUNT;

  -- Reparent solicitacoes
  UPDATE solicitacoes s
  SET process_id = dp.canonical_id
  FROM duplicate_processes dp
  WHERE s.process_id = dp.dup_id;
  GET DIAGNOSTICS v_reparented_solicitacoes = ROW_COUNT;

  -- Reparent timesheet_entries
  UPDATE timesheet_entries te
  SET process_id = dp.canonical_id
  FROM duplicate_processes dp
  WHERE te.process_id = dp.dup_id;
  GET DIAGNOSTICS v_reparented_timesheet = ROW_COUNT;

  -- Delete duplicate processes
  DELETE FROM processes p
  USING duplicate_processes dp
  WHERE p.id = dp.dup_id;
  GET DIAGNOSTICS v_deleted_processes = ROW_COUNT;

  DROP TABLE duplicate_processes;
  DROP TABLE canonical_processes;

  RAISE NOTICE 'Dedup: cal=%, deadlines=%, sol=%, ts=%, procs=%',
    v_deleted_calendar, v_deleted_deadlines, v_reparented_solicitacoes, v_reparented_timesheet, v_deleted_processes;
END $$;
