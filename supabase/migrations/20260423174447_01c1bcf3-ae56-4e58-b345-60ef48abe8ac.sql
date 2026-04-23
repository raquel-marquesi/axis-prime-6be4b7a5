-- Garante RLS habilitado
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- ===== INVOICES =====
DROP POLICY IF EXISTS "Allow authenticated users full access to invoices" ON public.invoices;
DROP POLICY IF EXISTS "Authenticated finance leaders coordinators can view invoices" ON public.invoices;
DROP POLICY IF EXISTS "Finance and leaders can insert invoices" ON public.invoices;
DROP POLICY IF EXISTS "Finance and leaders can update invoices" ON public.invoices;
DROP POLICY IF EXISTS "Only admins can delete invoices" ON public.invoices;
DROP POLICY IF EXISTS "Finance roles full access invoices" ON public.invoices;

CREATE POLICY "Finance roles full access invoices"
  ON public.invoices
  FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'socio')
    OR public.has_role(auth.uid(), 'gerente')
    OR public.has_role(auth.uid(), 'financeiro')
    OR public.has_role(auth.uid(), 'assistente_financeiro')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'socio')
    OR public.has_role(auth.uid(), 'gerente')
    OR public.has_role(auth.uid(), 'financeiro')
    OR public.has_role(auth.uid(), 'assistente_financeiro')
  );

-- ===== EXPENSES =====
DROP POLICY IF EXISTS "Allow authenticated users full access to expenses" ON public.expenses;
DROP POLICY IF EXISTS "Finance roles full access expenses" ON public.expenses;

CREATE POLICY "Finance roles full access expenses"
  ON public.expenses
  FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'socio')
    OR public.has_role(auth.uid(), 'gerente')
    OR public.has_role(auth.uid(), 'financeiro')
    OR public.has_role(auth.uid(), 'assistente_financeiro')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'socio')
    OR public.has_role(auth.uid(), 'gerente')
    OR public.has_role(auth.uid(), 'financeiro')
    OR public.has_role(auth.uid(), 'assistente_financeiro')
  );