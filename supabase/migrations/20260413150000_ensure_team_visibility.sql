
-- ============================================================
-- FIX: Forced Data Integrity and Policy Relaxation for Dashboard
-- ============================================================

-- 1. Ensure all profiles correctly have is_active set to true if not specified
-- This avoids rows being hidden by policies that expect explicit 'true'
UPDATE public.profiles SET is_active = true WHERE is_active IS NULL;

-- 2. Relax the viewing policy on profiles table
-- We want any logged-in user to see the firm structure (names, areas, sigla)
-- to populate the dashboard.
DROP POLICY IF EXISTS "Authenticated users can view all active profiles" ON public.profiles;
CREATE POLICY "Authenticated users can view all active profiles" 
  ON public.profiles FOR SELECT TO authenticated 
  USING (is_active = true OR reports_to IS NOT NULL);

-- 3. Ensure team_clients is fully viewable for all authenticated users
-- The 'Equipes' page relies on this to map coordinators to clients.
ALTER TABLE public.team_clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view team_clients" ON public.team_clients;
CREATE POLICY "Authenticated users can view team_clients"
  ON public.team_clients FOR SELECT TO authenticated
  USING (true);

-- 4. Re-grant search permissions to ensure frontend can access everything
GRANT SELECT ON public.profiles_safe TO authenticated;
GRANT SELECT ON public.team_clients TO authenticated;
