
-- 1. Fix invoices policies: public -> authenticated
DROP POLICY IF EXISTS "Financeiro and leaders can view invoices" ON invoices;
DROP POLICY IF EXISTS "Financeiro and leaders can insert invoices" ON invoices;
DROP POLICY IF EXISTS "Financeiro and leaders can update invoices" ON invoices;
DROP POLICY IF EXISTS "Only admins can delete invoices" ON invoices;
DROP POLICY IF EXISTS "Authenticated finance leaders coordinators can view invoices" ON invoices;
DROP POLICY IF EXISTS "Finance and leaders can insert invoices" ON invoices;
DROP POLICY IF EXISTS "Finance and leaders can update invoices" ON invoices;

CREATE POLICY "Authenticated finance leaders coordinators can view invoices"
  ON invoices FOR SELECT TO authenticated
  USING (is_financeiro(auth.uid()) OR is_coordinator_or_above(auth.uid()) OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Finance and leaders can insert invoices"
  ON invoices FOR INSERT TO authenticated
  WITH CHECK (is_financeiro(auth.uid()) OR is_leader_or_above(auth.uid()) OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Finance and leaders can update invoices"
  ON invoices FOR UPDATE TO authenticated
  USING (is_financeiro(auth.uid()) OR is_leader_or_above(auth.uid()) OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete invoices"
  ON invoices FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- 2. Fix billing_contacts DELETE: public -> authenticated
DROP POLICY IF EXISTS "Only admins can delete billing contacts" ON billing_contacts;
CREATE POLICY "Only admins can delete billing contacts"
  ON billing_contacts FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- 3. Fix clients DELETE: public -> authenticated
DROP POLICY IF EXISTS "Only admins can delete clients" ON clients;
CREATE POLICY "Only admins can delete clients"
  ON clients FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'));
