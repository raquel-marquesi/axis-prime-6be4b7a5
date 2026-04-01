
WITH best_match AS (
  SELECT DISTINCT ON (pd.id)
    pd.id AS deadline_id,
    te.id AS te_id,
    te.data_atividade,
    te.user_id AS te_user_id
  FROM process_deadlines pd
  JOIN timesheet_entries te ON te.process_id = pd.process_id
    AND te.data_atividade BETWEEN pd.data_prazo - 60 AND pd.data_prazo + 60
  WHERE pd.is_completed = false
    AND pd.timesheet_entry_id IS NULL
  ORDER BY pd.id,
    CASE WHEN pd.assigned_to = te.user_id THEN 0 ELSE 1 END,
    ABS(te.data_atividade::date - pd.data_prazo::date)
)
UPDATE process_deadlines pd
SET is_completed = true,
    completed_at = bm.data_atividade::timestamptz,
    completed_by = bm.te_user_id,
    timesheet_entry_id = bm.te_id,
    updated_at = now()
FROM best_match bm
WHERE pd.id = bm.deadline_id;
