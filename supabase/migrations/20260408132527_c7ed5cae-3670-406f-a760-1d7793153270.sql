
-- Billing Previews (header)
CREATE TABLE IF NOT EXISTS public.billing_previews (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  reference_month date NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved','invoiced')),
  total_items integer NOT NULL DEFAULT 0,
  total_value numeric NOT NULL DEFAULT 0,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.billing_previews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Coordinators and above can view billing_previews" ON public.billing_previews;
CREATE POLICY "Coordinators and above can view billing_previews"
  ON public.billing_previews FOR SELECT TO authenticated
  USING (is_coordinator_or_above(auth.uid()) OR is_financeiro(auth.uid()));

DROP POLICY IF EXISTS "Coordinators and above can insert billing_previews" ON public.billing_previews;
CREATE POLICY "Coordinators and above can insert billing_previews"
  ON public.billing_previews FOR INSERT TO authenticated
  WITH CHECK (is_coordinator_or_above(auth.uid()) OR is_financeiro(auth.uid()));

DROP POLICY IF EXISTS "Coordinators and above can update billing_previews" ON public.billing_previews;
CREATE POLICY "Coordinators and above can update billing_previews"
  ON public.billing_previews FOR UPDATE TO authenticated
  USING (is_coordinator_or_above(auth.uid()) OR is_financeiro(auth.uid()));

DROP POLICY IF EXISTS "Only admins can delete billing_previews" ON public.billing_previews;
CREATE POLICY "Only admins can delete billing_previews"
  ON public.billing_previews FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Billing Preview Items (detail lines)
CREATE TABLE IF NOT EXISTS public.billing_preview_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  preview_id uuid NOT NULL REFERENCES public.billing_previews(id) ON DELETE CASCADE,
  timesheet_entry_id uuid,
  process_id uuid,
  numero_processo text,
  reclamante text,
  tipo_atividade text,
  data_atividade date,
  descricao text,
  quantidade integer NOT NULL DEFAULT 1,
  valor_unitario numeric NOT NULL DEFAULT 0,
  valor_total numeric NOT NULL DEFAULT 0,
  is_duplicate boolean NOT NULL DEFAULT false,
  is_billable boolean NOT NULL DEFAULT true,
  exclusion_reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.billing_preview_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Coordinators and above can view billing_preview_items" ON public.billing_preview_items;
CREATE POLICY "Coordinators and above can view billing_preview_items"
  ON public.billing_preview_items FOR SELECT TO authenticated
  USING (is_coordinator_or_above(auth.uid()) OR is_financeiro(auth.uid()));

DROP POLICY IF EXISTS "Coordinators and above can insert billing_preview_items" ON public.billing_preview_items;
CREATE POLICY "Coordinators and above can insert billing_preview_items"
  ON public.billing_preview_items FOR INSERT TO authenticated
  WITH CHECK (is_coordinator_or_above(auth.uid()) OR is_financeiro(auth.uid()));

DROP POLICY IF EXISTS "Coordinators and above can update billing_preview_items" ON public.billing_preview_items;
CREATE POLICY "Coordinators and above can update billing_preview_items"
  ON public.billing_preview_items FOR UPDATE TO authenticated
  USING (is_coordinator_or_above(auth.uid()) OR is_financeiro(auth.uid()));

DROP POLICY IF EXISTS "Only admins can delete billing_preview_items" ON public.billing_preview_items;
CREATE POLICY "Only admins can delete billing_preview_items"
  ON public.billing_preview_items FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Trigger for updated_at on billing_previews
DROP TRIGGER IF EXISTS update_billing_previews_updated_at ON public.billing_previews;
CREATE TRIGGER update_billing_previews_updated_at
  BEFORE UPDATE ON public.billing_previews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
