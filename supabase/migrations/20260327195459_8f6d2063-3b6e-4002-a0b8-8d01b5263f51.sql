
-- Grant SELECT, INSERT, UPDATE, DELETE on all public tables to authenticated and anon roles
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', tbl);
    EXECUTE format('GRANT SELECT ON public.%I TO anon', tbl);
  END LOOP;
END $$;

-- Also grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;
