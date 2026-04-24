
DO $$
BEGIN
  ALTER TABLE public.process_deadlines
    ADD COLUMN IF NOT EXISTS solicitacao_id UUID REFERENCES public.solicitacoes(id) ON DELETE SET NULL;

  CREATE INDEX IF NOT EXISTS idx_process_deadlines_solicitacao_id ON public.process_deadlines(solicitacao_id);

  UPDATE public.process_deadlines pd
  SET solicitacao_id = s.id
  FROM public.solicitacoes s
  WHERE pd.id_tarefa_externa = s.id_tarefa_externa
    AND pd.id_tarefa_externa IS NOT NULL
    AND pd.solicitacao_id IS NULL;
EXCEPTION WHEN undefined_table THEN
  NULL;
END $$;
