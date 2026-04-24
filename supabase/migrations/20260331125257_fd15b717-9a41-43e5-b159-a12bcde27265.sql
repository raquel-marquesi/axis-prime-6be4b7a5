

DO $$
BEGIN
  -- Step 1: Delete duplicate process_deadlines, keeping the most recent per group
  DELETE FROM process_deadlines
  WHERE id NOT IN (
    SELECT DISTINCT ON (process_id, data_prazo, ocorrencia)
      id
    FROM process_deadlines
    ORDER BY process_id, data_prazo, ocorrencia, created_at DESC
  );

  -- Step 2: Also clean up orphan calendar_events pointing to deleted deadlines
  DELETE FROM calendar_events
  WHERE process_deadline_id IS NOT NULL
    AND process_deadline_id NOT IN (SELECT id FROM process_deadlines);

  -- Step 3: Create partial unique index to prevent future duplicates (non-completed only)
  EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS uq_deadline_process_date_ocorrencia
    ON process_deadlines (process_id, data_prazo, ocorrencia)
    WHERE is_completed = false';
EXCEPTION WHEN undefined_table THEN
  NULL;
END $$;
