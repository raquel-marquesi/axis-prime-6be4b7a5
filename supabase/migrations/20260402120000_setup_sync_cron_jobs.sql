-- ============================================================
-- AUTO-SYNC: pg_cron jobs para sincronização automática das planilhas
-- Requer: pg_cron e pg_net habilitados (já aplicados em migrações anteriores)
--
-- PRÉ-REQUISITO (executar UMA VEZ no SQL Editor do Supabase, não vai para git):
--   ALTER DATABASE postgres
--     SET app.settings.service_role_key = '<sua service_role key>';
-- ============================================================

-- Remove jobs existentes (idempotente)
DO $$
BEGIN
  PERFORM cron.unschedule(jobname)
  FROM cron.job
  WHERE jobname IN (
    'sync-email-agendamentos',
    'sync-solicitacoes-sheet',
    'sync-pautas-github',
    'sync-sheets-atividades'
  );
END $$;

-- Helper: chama uma edge function via pg_net
CREATE OR REPLACE FUNCTION private.invoke_edge_function(
  p_function_name TEXT,
  p_body         JSONB DEFAULT '{}'::jsonb
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public, extensions, net'
AS $$
DECLARE
  v_key  TEXT;
  v_url  TEXT;
  v_req  BIGINT;
BEGIN
  v_key := current_setting('app.settings.service_role_key', true);
  IF v_key IS NULL OR v_key = '' THEN
    RAISE WARNING 'app.settings.service_role_key não configurada — sync ignorado';
    RETURN NULL;
  END IF;

  v_url := 'https://pojnrtgqigouahmdanze.supabase.co/functions/v1/' || p_function_name;

  SELECT INTO v_req net.http_post(
    url     := v_url,
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || v_key
    ),
    body    := p_body
  );

  RETURN v_req;
END;
$$;

-- 1. Agendamentos via e-mail (planilha IA) — a cada 4 horas
SELECT cron.schedule(
  'sync-email-agendamentos',
  '0 */4 * * *',
  $$ SELECT private.invoke_edge_function('sync-email-agendamentos'); $$
);

-- 2. Solicitações planilha 5 clientes — a cada 4 horas (30 min de offset)
SELECT cron.schedule(
  'sync-solicitacoes-sheet',
  '30 */4 * * *',
  $$ SELECT private.invoke_edge_function('sync-solicitacoes-sheet'); $$
);

-- 3. Pautas (ACHÉ / ASSAÍ / CARREFOUR / RAIA) — a cada 6 horas
SELECT cron.schedule(
  'sync-pautas-github',
  '0 */6 * * *',
  $$ SELECT private.invoke_edge_function('sync-pautas-github'); $$
);

-- 4. Atividades (timesheet) — a cada 2 horas, dias úteis, 8h–20h
SELECT cron.schedule(
  'sync-sheets-atividades',
  '0 8-20/2 * * 1-5',
  $$ SELECT private.invoke_edge_function('sync-sheets', '{"step":"atividades"}'::jsonb); $$
);
