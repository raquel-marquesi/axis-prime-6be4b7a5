-- Data Repair: Fill missing client_id in timesheet_entries from associated processes
DO $$
DECLARE
    row_count integer;
BEGIN
  UPDATE public.timesheet_entries ts
  SET client_id = p.id_cliente
  FROM public.processes p
  WHERE ts.process_id = p.id
    AND ts.client_id IS NULL;

  GET DIAGNOSTICS row_count = ROW_COUNT;
  RAISE NOTICE 'Repaired % timesheet entries with missing client_id', row_count;
EXCEPTION WHEN undefined_table OR undefined_column THEN
  NULL;
END $$;
