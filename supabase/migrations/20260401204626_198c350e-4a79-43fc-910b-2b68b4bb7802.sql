
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
DROP POLICY IF EXISTS "Coordinators can view team profiles" ON public.profiles;
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
DROP POLICY IF EXISTS "Admins and leaders can view sync_logs" ON public.sync_logs;

CREATE POLICY "Admins and leaders can view sync_logs" ON public.sync_logs
  FOR SELECT TO authenticated
  USING (public.is_leader_or_above(auth.uid()));

-- ============================================================
-- 3. FIX: function search_path mutable
-- Set search_path on all functions missing it
-- ============================================================

DO $$
DECLARE
  fn text;
BEGIN
  -- Trigger functions (non-security-definer)
  FOR fn IN VALUES
    ('public.update_updated_at_column()'),
    ('public.uppercase_accounts()'),
    ('public.uppercase_billing_contacts()'),
    ('public.uppercase_client_contacts()'),
    ('public.uppercase_clients()'),
    ('public.uppercase_company_entities()'),
    ('public.uppercase_contract_keys()'),
    ('public.uppercase_economic_groups()'),
    ('public.uppercase_processes()'),
    ('public.uppercase_profiles()'),
    -- Security definer functions
    ('public.calculate_monthly_bonus(date)'),
    ('public.create_timesheet_unique_index()'),
    ('public.delete_timesheet_duplicates_batch(integer)'),
    ('public.delete_timesheet_duplicates_v2(integer)'),
    ('public.get_coordinator_for_client(uuid)'),
    ('public.get_goal_progress_data(date, date, uuid[])'),
    ('public.get_producao_aggregated(date, date, uuid, boolean, text)'),
    ('public.reconcile_open_deadlines()'),
    ('public.relink_orphan_timesheet_entries()'),
    ('public.smart_assign_deadline(uuid)'),
    -- get_prazos_rows overloads
    ('public.get_prazos_rows(text, uuid, integer, integer, text, text[])'),
    ('public.get_prazos_rows(date, uuid, integer, integer, text, text[])'),
    -- get_prazos_summary overloads
    ('public.get_prazos_summary(text, uuid)'),
    ('public.get_prazos_summary(date, uuid)')
  LOOP
    BEGIN
      EXECUTE 'ALTER FUNCTION ' || fn || ' SET search_path = ''public''';
    EXCEPTION WHEN undefined_function OR undefined_object THEN
      NULL;
    END;
  END LOOP;
END $$;
