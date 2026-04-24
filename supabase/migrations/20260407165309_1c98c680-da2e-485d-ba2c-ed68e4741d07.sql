DO $$
BEGIN
  PERFORM cron.schedule(
    'sync-baixa-prazos',
    '15 */2 * * *',
    $inner$
    SELECT net.http_post(
      url := 'https://pojnrtgqigouahmdanze.supabase.co/functions/v1/sync-baixa-prazos',
      headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvam5ydGdxaWdvdWFobWRhbnplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1NTYwNzgsImV4cCI6MjA5MDEzMjA3OH0.vVMmb87rE-d8Hv0YEXtAEk8I9PoguRmpi7bdYvnqbL0", "Content-Type": "application/json"}'::jsonb,
      body := '{}'::jsonb
    ) AS request_id;
    $inner$
  );
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron não disponível — job ignorado: %', SQLERRM;
END $$;
