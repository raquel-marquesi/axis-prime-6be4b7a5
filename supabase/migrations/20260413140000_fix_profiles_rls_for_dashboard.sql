
-- ============================================================
-- FIX: Team Dashboard Distribution Visibility
-- ============================================================

-- 1. Profiles Table: Allow all authenticated users to see active profiles
-- This is necessary for the Equipes page to build the firm-wide hierarchy.
-- It works in conjunction with the profiles_safe view which filters sensitive info.
DROP POLICY IF EXISTS "Authenticated users can view all active profiles" ON public.profiles;
CREATE POLICY "Authenticated users can view all active profiles" 
  ON public.profiles FOR SELECT TO authenticated 
  USING (is_active = true);

-- 2. Team Clients Table: Enable RLS and set policies
-- Allow everyone to view (read-only) but restrict editing to coordinators and above.
ALTER TABLE public.team_clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view team_clients" ON public.team_clients;
CREATE POLICY "Authenticated users can view team_clients"
  ON public.team_clients FOR SELECT TO authenticated
  USING (true);

-- Allow coordinators and admins to insert/update/delete team associations
DROP POLICY IF EXISTS "Coordinators and admins can manage team_clients" ON public.team_clients;
CREATE POLICY "Coordinators and admins can manage team_clients"
  ON public.team_clients FOR ALL TO authenticated
  USING (
    public.is_coordinator_or_above(auth.uid()) OR has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    public.is_coordinator_or_above(auth.uid()) OR has_role(auth.uid(), 'admin')
  );
