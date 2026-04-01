
-- ============================================================
-- 1. FIX: profiles sensitive data exposure
-- Remove the overly broad SELECT policy, keep own-profile + admin policies
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON public.profiles;

-- Create a policy for authenticated users to read non-sensitive columns of all profiles
-- Since RLS is row-level, we use a view approach: allow all authenticated to see profiles
-- but only through the profiles_safe view. Direct table access restricted to own + admin.
-- The "Users can view their own profile" and "Admins and managers can view all profiles" 
-- policies already exist and cover the needed access.

-- Also allow coordinators to view their team members' profiles
CREATE POLICY "Coordinators can view team profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles me
      WHERE me.user_id = auth.uid()
        AND me.id = profiles.reports_to
    )
  );

-- Grant SELECT on profiles_safe view to authenticated (this already works but ensure it)
GRANT SELECT ON public.profiles_safe TO authenticated;

-- ============================================================
-- 2. FIX: sync_logs policy - restrict to authenticated admins/leaders
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can view sync_logs" ON public.sync_logs;

CREATE POLICY "Admins and leaders can view sync_logs" ON public.sync_logs
  FOR SELECT TO authenticated
  USING (public.is_leader_or_above(auth.uid()));

-- ============================================================
-- 3. FIX: function search_path mutable
-- Set search_path on all functions missing it
-- ============================================================

-- Trigger functions (non-security-definer)
ALTER FUNCTION public.update_updated_at_column() SET search_path = 'public';
ALTER FUNCTION public.uppercase_accounts() SET search_path = 'public';
ALTER FUNCTION public.uppercase_billing_contacts() SET search_path = 'public';
ALTER FUNCTION public.uppercase_client_contacts() SET search_path = 'public';
ALTER FUNCTION public.uppercase_clients() SET search_path = 'public';
ALTER FUNCTION public.uppercase_company_entities() SET search_path = 'public';
ALTER FUNCTION public.uppercase_contract_keys() SET search_path = 'public';
ALTER FUNCTION public.uppercase_economic_groups() SET search_path = 'public';
ALTER FUNCTION public.uppercase_processes() SET search_path = 'public';
ALTER FUNCTION public.uppercase_profiles() SET search_path = 'public';

-- Security definer functions
ALTER FUNCTION public.calculate_monthly_bonus(date) SET search_path = 'public';
ALTER FUNCTION public.create_timesheet_unique_index() SET search_path = 'public';
ALTER FUNCTION public.delete_timesheet_duplicates_batch(integer) SET search_path = 'public';
ALTER FUNCTION public.delete_timesheet_duplicates_v2(integer) SET search_path = 'public';
ALTER FUNCTION public.get_coordinator_for_client(uuid) SET search_path = 'public';
ALTER FUNCTION public.get_goal_progress_data(date, date, uuid[]) SET search_path = 'public';
ALTER FUNCTION public.get_producao_aggregated(date, date, uuid, boolean, text) SET search_path = 'public';
ALTER FUNCTION public.reconcile_open_deadlines() SET search_path = 'public';
ALTER FUNCTION public.relink_orphan_timesheet_entries() SET search_path = 'public';
ALTER FUNCTION public.smart_assign_deadline(uuid) SET search_path = 'public';

-- get_prazos_rows has two overloads
ALTER FUNCTION public.get_prazos_rows(text, uuid, integer, integer, text, text[]) SET search_path = 'public';
ALTER FUNCTION public.get_prazos_rows(date, uuid, integer, integer, text, text[]) SET search_path = 'public';

-- get_prazos_summary has two overloads
ALTER FUNCTION public.get_prazos_summary(text, uuid) SET search_path = 'public';
ALTER FUNCTION public.get_prazos_summary(date, uuid) SET search_path = 'public';
