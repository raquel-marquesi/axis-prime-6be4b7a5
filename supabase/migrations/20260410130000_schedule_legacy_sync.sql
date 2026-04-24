-- ============================================================
-- AUTO-SYNC: Agendamento da sincronização transicional legada
-- ============================================================
DO $$
BEGIN
  -- Remove job existente se houver (para permitir re-push limpo)
  PERFORM cron.unschedule('sync-legacy-timesheet')
  FROM cron.job
  WHERE jobname = 'sync-legacy-timesheet';

  -- 1. Sincronização Legada (Planilha Transicional) — a cada 6 horas
  PERFORM cron.schedule(
    'sync-legacy-timesheet',
    '0 */6 * * *',
    $inner$ SELECT private.invoke_edge_function('sync-baixa-prazos'); $inner$
  );
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron não disponível — job ignorado: %', SQLERRM;
END $$;
