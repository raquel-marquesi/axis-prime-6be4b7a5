-- 1. Fix process_deadlines: change SELECT policy from public to authenticated
DROP POLICY IF EXISTS "Authenticated users can view all deadlines" ON process_deadlines;
CREATE POLICY "Authenticated users can view all deadlines"
  ON process_deadlines FOR SELECT
  TO authenticated
  USING (true);

-- 2. Fix user_permission_overrides: restrict SELECT to admins + own user
DROP POLICY IF EXISTS "Authenticated users can view overrides" ON user_permission_overrides;
CREATE POLICY "Users can view own overrides or admins view all"
  ON user_permission_overrides FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::text)
    OR user_id = auth.uid()
  );

-- 3. Fix profiles_safe view: recreate with SECURITY INVOKER
DROP VIEW IF EXISTS profiles_safe;
CREATE VIEW profiles_safe 
WITH (security_invoker = true)
AS
  SELECT user_id, full_name, email, area, sigla, is_active
  FROM profiles;
