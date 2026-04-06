
-- Helper function to get profile id by user_id (SECURITY DEFINER to avoid recursion)
CREATE OR REPLACE FUNCTION public.get_profile_id_for_user(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT id FROM public.profiles WHERE user_id = _user_id LIMIT 1;
$$;

-- Helper function to check if a user reports to a given profile_id
CREATE OR REPLACE FUNCTION public.reports_to_user(_target_user_id uuid, _manager_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = _target_user_id
      AND reports_to = _manager_profile_id
  );
$$;

-- Fix profiles: drop recursive coordinator policy and replace
DROP POLICY IF EXISTS "Coordinators can view team profiles" ON public.profiles;
CREATE POLICY "Coordinators can view team profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    is_coordinator_or_above(auth.uid())
    AND reports_to = public.get_profile_id_for_user(auth.uid())
  );

-- Fix calendar_events: drop recursive coordinator policy and replace
DROP POLICY IF EXISTS "Coordinators can view team events" ON public.calendar_events;
CREATE POLICY "Coordinators can view team events"
  ON public.calendar_events FOR SELECT TO authenticated
  USING (
    is_coordinator_or_above(auth.uid())
    AND public.reports_to_user(user_id, public.get_profile_id_for_user(auth.uid()))
  );
