-- ============================================================
-- SAFETY NET: Ensure all critical RLS policies exist
-- This migration is idempotent — safe to re-run.
-- ============================================================

-- ============================================================
-- 1. process_deadlines — Must be readable by authenticated users
-- ============================================================
ALTER TABLE public.process_deadlines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view all deadlines" ON public.process_deadlines;
CREATE POLICY "Authenticated users can view all deadlines"
  ON public.process_deadlines FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage deadlines" ON public.process_deadlines;
CREATE POLICY "Authenticated users can manage deadlines"
  ON public.process_deadlines FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- 2. processes — Must be readable by authenticated users
-- ============================================================
ALTER TABLE public.processes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users full access to processes" ON public.processes;
CREATE POLICY "Allow authenticated users full access to processes"
  ON public.processes FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- 3. profiles — Must be readable by authenticated users
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view all active profiles" ON public.profiles;
CREATE POLICY "Authenticated users can view all active profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- 4. user_roles — Must be readable by authenticated users
-- ============================================================
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view all roles" ON public.user_roles;
CREATE POLICY "Authenticated users can view all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 5. clients — Must be readable by authenticated users
-- ============================================================
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view active clients" ON public.clients;
CREATE POLICY "Authenticated users can view active clients"
  ON public.clients FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can manage clients" ON public.clients;
CREATE POLICY "Admins can manage clients"
  ON public.clients FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gerente') OR public.has_role(auth.uid(), 'socio'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gerente') OR public.has_role(auth.uid(), 'socio'));

-- ============================================================
-- 6. invoices — Must be readable by authenticated users
-- ============================================================
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users full access to invoices" ON public.invoices;
CREATE POLICY "Allow authenticated users full access to invoices"
  ON public.invoices FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- 7. expenses — Must be readable by authenticated users
-- ============================================================
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users full access to expenses" ON public.expenses;
CREATE POLICY "Allow authenticated users full access to expenses"
  ON public.expenses FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- 8. solicitacoes — Must be readable by authenticated users
-- ============================================================
ALTER TABLE public.solicitacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view solicitacoes" ON public.solicitacoes;
CREATE POLICY "Authenticated users can view solicitacoes"
  ON public.solicitacoes FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================
-- 9. role_permissions + permissions — Must be readable
-- ============================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'role_permissions') THEN
    ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Authenticated can read role_permissions" ON public.role_permissions;
    CREATE POLICY "Authenticated can read role_permissions"
      ON public.role_permissions FOR SELECT TO authenticated USING (true);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'permissions') THEN
    ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Authenticated can read permissions" ON public.permissions;
    CREATE POLICY "Authenticated can read permissions"
      ON public.permissions FOR SELECT TO authenticated USING (true);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_permission_overrides') THEN
    ALTER TABLE public.user_permission_overrides ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Users can view own overrides or admins view all" ON public.user_permission_overrides;
    CREATE POLICY "Users can view own overrides or admins view all"
      ON public.user_permission_overrides FOR SELECT TO authenticated
      USING (public.has_role(auth.uid(), 'admin') OR user_id = auth.uid());
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'custom_roles') THEN
    ALTER TABLE public.custom_roles ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Authenticated can read custom_roles" ON public.custom_roles;
    CREATE POLICY "Authenticated can read custom_roles"
      ON public.custom_roles FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

-- ============================================================
-- 10. Recreate the deadlines RPC (in case it was never applied)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_all_deadlines_with_details(
  p_user_id uuid DEFAULT NULL,
  p_team_user_ids uuid[] DEFAULT NULL,
  p_date_from date DEFAULT NULL,
  p_date_to date DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  process_id uuid,
  data_prazo date,
  ocorrencia text,
  detalhes text,
  is_completed boolean,
  assigned_to uuid,
  completed_by uuid,
  ultimo_andamento text,
  solicitacao_id uuid,
  numero_processo text,
  numero_pasta integer,
  reclamante_nome text,
  reclamadas text[],
  area text,
  assigned_user_name text,
  completed_by_name text,
  solicitacao_titulo text,
  solicitacao_prioridade text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    pd.id,
    pd.process_id,
    pd.data_prazo,
    pd.ocorrencia,
    pd.detalhes,
    COALESCE(pd.is_completed, false) AS is_completed,
    pd.assigned_to,
    pd.completed_by,
    pd.ultimo_andamento,
    pd.solicitacao_id,
    p.numero_processo,
    p.numero_pasta,
    p.reclamante_nome,
    p.reclamadas,
    p.area,
    pa.full_name AS assigned_user_name,
    pc.full_name AS completed_by_name,
    s.titulo AS solicitacao_titulo,
    s.prioridade AS solicitacao_prioridade
  FROM process_deadlines pd
  INNER JOIN processes p ON p.id = pd.process_id
  LEFT JOIN profiles pa ON pa.user_id = pd.assigned_to
  LEFT JOIN profiles pc ON pc.user_id = pd.completed_by
  LEFT JOIN solicitacoes s ON s.id = pd.solicitacao_id
  WHERE
    (p_date_from IS NULL OR pd.data_prazo >= p_date_from)
    AND (p_date_to IS NULL OR pd.data_prazo <= p_date_to)
    AND (
      p_user_id IS NULL
      OR pd.assigned_to = p_user_id
      OR (p_team_user_ids IS NOT NULL AND pd.assigned_to = ANY(p_team_user_ids))
    )
  ORDER BY pd.data_prazo ASC;
$$;

-- ============================================================
-- 11. Ensure profiles_safe view exists
-- ============================================================
DROP VIEW IF EXISTS public.profiles_safe;
CREATE VIEW public.profiles_safe
WITH (security_invoker = true)
AS
  SELECT user_id, full_name, email, area, sigla, is_active, reports_to
  FROM public.profiles;

GRANT SELECT ON public.profiles_safe TO authenticated;
