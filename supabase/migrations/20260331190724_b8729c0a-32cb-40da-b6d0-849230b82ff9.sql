
GRANT SELECT ON public.activity_types TO service_role, authenticated;
GRANT SELECT ON public.user_aliases TO service_role, authenticated;
GRANT SELECT ON public.client_aliases TO service_role, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.timesheet_entries TO service_role;
GRANT SELECT, INSERT ON public.processes TO service_role;
