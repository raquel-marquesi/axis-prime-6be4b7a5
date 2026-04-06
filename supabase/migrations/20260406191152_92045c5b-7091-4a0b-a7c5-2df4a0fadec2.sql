-- Part 1: Fix source on existing deadlines from email solicitacoes
UPDATE process_deadlines pd
SET source = 'sheet_agendamentos'
FROM solicitacoes s
WHERE s.origem = 'email_sheet'
  AND s.process_id IS NOT NULL
  AND s.process_id = pd.process_id
  AND s.data_limite = pd.data_prazo
  AND pd.source = 'planilha_cliente'
  AND pd.solicitacao_id IS NULL;

-- Part 2: Link solicitacao_id on orphan deadlines
UPDATE process_deadlines pd
SET solicitacao_id = s.id
FROM solicitacoes s
WHERE s.origem = 'email_sheet'
  AND s.process_id IS NOT NULL
  AND s.process_id = pd.process_id
  AND s.data_limite = pd.data_prazo
  AND pd.solicitacao_id IS NULL;

-- Part 3: Enable pg_cron and pg_net
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Part 4: Schedule sync every 2 hours
SELECT cron.schedule(
  'sync-email-agendamentos-every-2h',
  '0 */2 * * *',
  $$
  SELECT net.http_post(
    url := 'https://pojnrtgqigouahmdanze.supabase.co/functions/v1/sync-email-agendamentos',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvam5ydGdxaWdvdWFobWRhbnplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1NTYwNzgsImV4cCI6MjA5MDEzMjA3OH0.vVMmb87rE-d8Hv0YEXtAEk8I9PoguRmpi7bdYvnqbL0"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);