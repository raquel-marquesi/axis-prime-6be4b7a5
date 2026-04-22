-- Add 'convidado' role for users awaiting approval
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'convidado';