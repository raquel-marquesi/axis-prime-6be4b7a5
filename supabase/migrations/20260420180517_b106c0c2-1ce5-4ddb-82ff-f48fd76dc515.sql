
-- 1. Tabela de domínios autorizados
CREATE TABLE IF NOT EXISTS public.authorized_email_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

ALTER TABLE public.authorized_email_domains ENABLE ROW LEVEL SECURITY;

-- Apenas admins gerenciam
DROP POLICY IF EXISTS "Admins can view authorized domains" ON public.authorized_email_domains;
CREATE POLICY "Admins can view authorized domains"
ON public.authorized_email_domains FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can insert authorized domains" ON public.authorized_email_domains;
CREATE POLICY "Admins can insert authorized domains"
ON public.authorized_email_domains FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete authorized domains" ON public.authorized_email_domains;
CREATE POLICY "Admins can delete authorized domains"
ON public.authorized_email_domains FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update authorized domains" ON public.authorized_email_domains;
CREATE POLICY "Admins can update authorized domains"
ON public.authorized_email_domains FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 2. Seed dos domínios
INSERT INTO public.authorized_email_domains (domain) VALUES
  ('marquesi.com.br'),
  ('everpledgegames.com'),
  ('mcmadvogados.com'),
  ('qmadvogados.com.br'),
  ('vantari.com.br'),
  ('lomaconsultoria.com')
ON CONFLICT (domain) DO NOTHING;

-- 3. Função pública para validar domínio (acessível sem auth para validação no frontend antes do signUp)
CREATE OR REPLACE FUNCTION public.is_email_domain_authorized(p_email text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.authorized_email_domains
    WHERE domain = lower(split_part(p_email, '@', 2))
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_email_domain_authorized(text) TO anon, authenticated;

-- 4. Atualizar handle_new_user para bloquear domínios não autorizados
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
  -- Validar domínio do e-mail
  v_domain := lower(split_part(NEW.email, '@', 2));
  
  SELECT EXISTS (
    SELECT 1 FROM public.authorized_email_domains WHERE domain = v_domain
  ) INTO v_is_authorized;

  IF NOT v_is_authorized THEN
    -- Remover o usuário criado e bloquear o acesso
    DELETE FROM auth.users WHERE id = NEW.id;
    RAISE EXCEPTION 'DOMAIN_NOT_AUTHORIZED: O domínio "%" não está autorizado a acessar este sistema.', v_domain
      USING ERRCODE = 'P0001';
  END IF;

  -- Verifica se já existe profile com este email mas user_id diferente
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
    DELETE FROM public.user_roles WHERE user_id = v_old_user_id;

    UPDATE public.profiles
    SET user_id = NEW.id,
        full_name = COALESCE(NEW.raw_user_meta_data->>'full_name', full_name),
        is_active = true
    WHERE user_id = v_old_user_id;
  ELSE
    INSERT INTO public.profiles (user_id, full_name, email, is_active)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
      NEW.email,
      true
    )
    ON CONFLICT (user_id) DO NOTHING;

    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'usuario')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;
