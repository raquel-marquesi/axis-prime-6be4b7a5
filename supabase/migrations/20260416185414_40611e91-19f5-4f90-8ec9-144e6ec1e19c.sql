INSERT INTO public.user_roles (user_id, role)
VALUES ('e9d6e6e3-9231-4b7e-a7b5-85e318bb3a40', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;