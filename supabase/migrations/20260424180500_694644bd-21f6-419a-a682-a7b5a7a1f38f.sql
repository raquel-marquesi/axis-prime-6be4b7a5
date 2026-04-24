-- 1. Restaurar admin da Raquel
INSERT INTO public.user_roles (user_id, role)
VALUES ('a62e577b-9708-4a45-86a5-7e1212ecc9b5', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- 2. Restaurar GRANTs essenciais a service_role
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT EXECUTE ON FUNCTIONS TO service_role;

-- Restaurar GRANTs para authenticated
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- 3. Recriar policies derrubadas em profiles
DROP POLICY IF EXISTS "Authenticated users can view all active profiles" ON public.profiles;
CREATE POLICY "Authenticated users can view all active profiles"
ON public.profiles FOR SELECT TO authenticated
USING (is_active = true OR reports_to IS NOT NULL OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

-- 4. Recriar policy em user_roles
DROP POLICY IF EXISTS "Authenticated users can view all roles" ON public.user_roles;
CREATE POLICY "Authenticated users can view all roles"
ON public.user_roles FOR SELECT TO authenticated
USING (true);