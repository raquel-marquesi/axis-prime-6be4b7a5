INSERT INTO public.user_roles (user_id, role)
VALUES ('2de1d246-b245-43a6-831e-ae583e1a4a55', 'admin'::public.app_role)
ON CONFLICT (user_id, role) DO NOTHING;