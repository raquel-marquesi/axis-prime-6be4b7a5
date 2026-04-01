DO $$
DECLARE
  r RECORD;
  v_count INT := 0;
BEGIN
  FOR r IN
    SELECT id FROM solicitacoes
    WHERE assigned_to IS NULL
      AND status IN ('pendente', 'em_andamento')
  LOOP
    PERFORM assign_calculation(r.id);
    v_count := v_count + 1;
  END LOOP;
  RAISE NOTICE 'Rebalanceados: % prazos', v_count;
END $$;