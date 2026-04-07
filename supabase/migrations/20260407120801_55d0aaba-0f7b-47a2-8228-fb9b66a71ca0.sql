DROP VIEW IF EXISTS public.profiles_safe;

CREATE VIEW public.profiles_safe
WITH (security_invoker=on) AS
SELECT
  id,
  user_id,
  full_name,
  email,
  area,
  sigla,
  is_active,
  reports_to
FROM public.profiles;