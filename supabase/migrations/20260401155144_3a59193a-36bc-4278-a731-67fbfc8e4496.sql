
WITH best_match AS (
  SELECT DISTINCT ON (pd.id)
    pd.id as deadline_id,
    te.id as te_id,
    te.user_id as te_user_id,
    te.data_atividade,
    pd.assigned_to
  FROM process_deadlines pd
  JOIN timesheet_entries te ON te.process_id = pd.process_id
    AND te.data_atividade BETWEEN pd.data_prazo - 30 AND pd.data_prazo + 30
  WHERE pd.is_completed = false
  ORDER BY pd.id, ABS(te.data_atividade - pd.data_prazo) ASC
)
UPDATE process_deadlines pd SET
  is_completed = true,
  completed_at = bm.data_atividade::timestamptz,
  completed_by = bm.te_user_id,
  timesheet_entry_id = bm.te_id,
  assigned_to = COALESCE(pd.assigned_to, bm.te_user_id),
  updated_at = now()
FROM best_match bm
WHERE pd.id = bm.deadline_id;
