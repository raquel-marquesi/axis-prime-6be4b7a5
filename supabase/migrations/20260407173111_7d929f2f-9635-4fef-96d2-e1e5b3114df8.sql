
-- Step 1: Delete duplicate pending deadlines (keep oldest, delete newest)
DELETE FROM public.process_deadlines
WHERE id IN (
  SELECT b.id
  FROM public.process_deadlines a
  JOIN public.process_deadlines b ON a.process_id = b.process_id
    AND a.id < b.id
    AND a.is_completed = false
    AND b.is_completed = false
    AND ABS(a.data_prazo - b.data_prazo) <= 1
    AND a.ocorrencia = b.ocorrencia
);

-- Step 2: Create unique partial index to prevent future duplicates
-- This allows completed deadlines to coexist but prevents duplicate pending ones
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_pending_deadline
ON public.process_deadlines (process_id, data_prazo, ocorrencia)
WHERE is_completed = false;
