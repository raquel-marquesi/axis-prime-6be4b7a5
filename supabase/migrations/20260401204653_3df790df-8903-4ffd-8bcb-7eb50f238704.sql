
-- Fix: recreate profiles_safe view with security_invoker = true
-- This ensures RLS policies of the querying user are applied, not the view owner's
DROP VIEW IF EXISTS public.profiles_safe;

CREATE VIEW public.profiles_safe 
WITH (security_invoker = true)
AS
SELECT 
  id,
  user_id,
  full_name,
  email,
  avatar_url,
  area,
  is_active,
  reports_to,
  sigla,
  branch_id,
  created_at,
  updated_at
FROM public.profiles;

GRANT SELECT ON public.profiles_safe TO authenticated;
GRANT SELECT ON public.profiles_safe TO anon;
