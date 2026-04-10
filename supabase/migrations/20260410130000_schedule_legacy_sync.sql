-- ============================================================
-- AUTO-SYNC: Agendamento da sincronização transicional legada
-- ============================================================

-- Remove job existente se houver (para permitir re-push limpo)
DO $$
BEGIN
  PERFORM cron.unschedule('sync-legacy-timesheet')
  FROM cron.job
  WHERE jobname = 'sync-legacy-timesheet';
END $$;

-- 1. Sincronização Legada (Planilha Transicional) — a cada 6 horas
-- Atividades: 00:00, 06:00, 12:00, 18:00
SELECT cron.schedule(
  'sync-legacy-timesheet',
  '0 */6 * * *',
  $$ SELECT private.invoke_edge_function('sync-baixa-prazos'); $$
);
