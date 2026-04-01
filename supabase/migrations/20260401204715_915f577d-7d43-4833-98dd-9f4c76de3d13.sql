
-- Revert profiles_safe to security_invoker=false (SECURITY DEFINER behavior)
-- This is safe because the view explicitly excludes sensitive columns (cpf, banco, agencia, conta, conta_digito, pix_key)
-- It allows all authenticated users to look up colleague names/areas without exposing financial data
DROP VIEW IF EXISTS public.profiles_safe;

CREATE VIEW public.profiles_safe AS
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
