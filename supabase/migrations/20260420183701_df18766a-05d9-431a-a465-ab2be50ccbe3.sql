
-- Add approval fields to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS approved boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS approved_by uuid NULL;

-- Mark existing users as approved (so we don't lock them out)
UPDATE public.profiles
SET approved = true, approved_at = now()
WHERE approved = false;

-- Ensure authorized_email_domains has the expected schema (it already exists with id PK).
-- Add active column if missing.
ALTER TABLE public.authorized_email_domains
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;

-- Re-seed authorized domains (idempotent)
INSERT INTO public.authorized_email_domains (domain) VALUES
  ('marquesi.com.br'),
  ('everpledgegames.com'),
  ('mcmadvogados.com'),
  ('qmadvogados.com.br'),
  ('vantari.com.br'),
  ('lomaconsultoria.com')
ON CONFLICT (domain) DO NOTHING;

-- Update handle_new_user: validate domain, create minimal profile with approved=false, NO automatic role
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
    -- Minimal profile, pending approval, NO role assigned
    INSERT INTO public.profiles (user_id, full_name, email, is_active, approved)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
      NEW.email,
      true,
      false
    )
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;

-- Recreate the trigger (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
