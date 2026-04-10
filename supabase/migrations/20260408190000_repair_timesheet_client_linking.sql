-- Data Repair: Fill missing client_id in timesheet_entries from associated processes
UPDATE public.timesheet_entries ts
SET client_id = p.id_cliente
FROM public.processes p
WHERE ts.process_id = p.id 
  AND ts.client_id IS NULL;

-- Log the repair for verification
DO $$
DECLARE
    row_count integer;
BEGIN
    GET DIAGNOSTICS row_count = ROW_COUNT;
    RAISE NOTICE 'Repaired % timesheet entries with missing client_id', row_count;
END $$;
