-- 1. Update handle_new_user trigger to assign 'convidado' role to new pending users
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_old_user_id uuid;
  v_domain text;
  v_is_authorized boolean;
BEGIN
  -- Validate email domain
  v_domain := lower(split_part(NEW.email, '@', 2));

  SELECT EXISTS (
    SELECT 1 FROM public.authorized_email_domains
    WHERE domain = v_domain AND COALESCE(active, true) = true
  ) INTO v_is_authorized;

  IF NOT v_is_authorized THEN
    DELETE FROM auth.users WHERE id = NEW.id;
    RAISE EXCEPTION 'DOMAIN_NOT_AUTHORIZED: O domínio "%" não está autorizado a acessar este sistema.', v_domain
      USING ERRCODE = 'P0001';
  END IF;

  -- Re-attach legacy profile with same email but different user_id
  SELECT user_id INTO v_old_user_id
  FROM public.profiles
  WHERE email = NEW.email
    AND user_id <> NEW.id
  LIMIT 1;

  IF v_old_user_id IS NOT NULL THEN
    UPDATE public.timesheet_entries SET user_id = NEW.id WHERE user_id = v_old_user_id;
    UPDATE public.calendar_events SET user_id = NEW.id WHERE user_id = v_old_user_id;
    UPDATE public.bonus_calculations SET user_id = NEW.id WHERE user_id = v_old_user_id;
    UPDATE public.process_deadlines SET assigned_to = NEW.id WHERE assigned_to = v_old_user_id;
    UPDATE public.process_deadlines SET completed_by = NEW.id WHERE completed_by = v_old_user_id;
    UPDATE public.user_roles SET user_id = NEW.id WHERE user_id = v_old_user_id;

    UPDATE public.profiles
    SET user_id = NEW.id,
        full_name = COALESCE(NEW.raw_user_meta_data->>'full_name', full_name),
        is_active = true
    WHERE user_id = v_old_user_id;
  ELSE
    -- Minimal profile, pending approval
    INSERT INTO public.profiles (user_id, full_name, email, is_active, approved)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
      NEW.email,
      true,
      false
    )
    ON CONFLICT (user_id) DO NOTHING;

    -- Assign temporary 'convidado' role so the user can hit /aguardando-aprovacao
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'convidado'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;

-- 2. Backfill existing users that are pending approval and have no role
INSERT INTO public.user_roles (user_id, role)
SELECT p.user_id, 'convidado'::public.app_role
FROM public.profiles p
WHERE p.approved = false
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.user_id
  )
ON CONFLICT (user_id, role) DO NOTHING;

-- 3. Ensure users can read their own role (needed so AuthContext can detect convidado state)
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);