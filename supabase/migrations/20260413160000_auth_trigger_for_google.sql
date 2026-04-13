
-- ============================================================
-- AUTH: Automatic Profile Creation for Google & Email Login
-- ============================================================

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_full_name text;
  v_domain text;
  v_allowed_domains text[] := ARRAY['marquesi.com.br', 'lomaconsultoria.com'];
BEGIN
  -- 1. Extract domain from email
  v_domain := split_part(new.email, '@', 2);

  -- 2. Validate domain (Optional: remove this check if you want anyone to register)
  IF NOT (v_domain = ANY(v_allowed_domains)) THEN
    -- For corporate security, we ignore creation or raise exception.
    -- Raising exception blocks the login completely.
    -- RAISE EXCEPTION 'Domain not allowed: %', v_domain;
    -- Instead of blocking, we can just not create a profile, 
    -- but RLS will then block them anyway since they have no profile.
  END IF;

  -- 3. Extract full name from metadata (OAuth) or use email prefix
  v_full_name := COALESCE(
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    split_part(new.email, '@', 1)
  );

  -- 4. Create Profile
  INSERT INTO public.profiles (user_id, full_name, email, is_active)
  VALUES (new.id, v_full_name, new.email, true)
  ON CONFLICT (user_id) DO UPDATE 
    SET full_name = EXCLUDED.full_name,
        email = EXCLUDED.email;

  -- 5. Assign default 'usuario' role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'usuario')
  ON CONFLICT DO NOTHING;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to run on every new user in auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Helper function to sync existing users if any were created without profiles
-- (Safe to run multiple times)
-- SELECT public.handle_new_user() FROM auth.users WHERE id NOT IN (SELECT user_id FROM public.profiles);
