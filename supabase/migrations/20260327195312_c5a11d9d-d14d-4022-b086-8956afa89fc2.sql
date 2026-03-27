
-- Insert profile for admin user
INSERT INTO public.profiles (user_id, full_name, email, is_active)
VALUES ('a62e577b-9708-4a45-86a5-7e1212ecc9b5', 'RAQUEL MARQUESI', 'raquel@marquesi.com.br', true)
ON CONFLICT (user_id) DO UPDATE SET is_active = true;

-- Insert admin role
INSERT INTO public.user_roles (user_id, role)
VALUES ('a62e577b-9708-4a45-86a5-7e1212ecc9b5', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;
