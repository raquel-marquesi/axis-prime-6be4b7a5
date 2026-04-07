-- 1. Fix custom_roles: public → authenticated
DROP POLICY IF EXISTS "Authenticated users can view custom_roles" ON custom_roles;
CREATE POLICY "Authenticated users can view custom_roles"
  ON custom_roles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins managers and finance can insert custom_roles" ON custom_roles;
CREATE POLICY "Admins managers and finance can insert custom_roles"
  ON custom_roles FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'gerente') OR has_role(auth.uid(), 'financeiro'));

DROP POLICY IF EXISTS "Admins managers and finance can update custom_roles" ON custom_roles;
CREATE POLICY "Admins managers and finance can update custom_roles"
  ON custom_roles FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'gerente') OR has_role(auth.uid(), 'financeiro'));

DROP POLICY IF EXISTS "Only admins can delete custom_roles" ON custom_roles;
CREATE POLICY "Only admins can delete custom_roles"
  ON custom_roles FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- 2. Fix bank_accounts_config: restrict SELECT + fix roles
DROP POLICY IF EXISTS "Authenticated users can view bank_accounts_config" ON bank_accounts_config;
CREATE POLICY "Finance and admins can view bank_accounts_config"
  ON bank_accounts_config FOR SELECT TO authenticated
  USING (is_financeiro(auth.uid()) OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'gerente'));

DROP POLICY IF EXISTS "Only admins can insert bank_accounts_config" ON bank_accounts_config;
CREATE POLICY "Only admins can insert bank_accounts_config"
  ON bank_accounts_config FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Only admins can update bank_accounts_config" ON bank_accounts_config;
CREATE POLICY "Only admins can update bank_accounts_config"
  ON bank_accounts_config FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Only admins can delete bank_accounts_config" ON bank_accounts_config;
CREATE POLICY "Only admins can delete bank_accounts_config"
  ON bank_accounts_config FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- 3. Fix contract_pricing: restrict SELECT to leaders/finance
DROP POLICY IF EXISTS "Authenticated users can view contract_pricing" ON contract_pricing;
CREATE POLICY "Leaders and finance can view contract_pricing"
  ON contract_pricing FOR SELECT TO authenticated
  USING (is_leader_or_above(auth.uid()) OR is_financeiro(auth.uid()) OR is_coordinator_or_above(auth.uid()));

-- 4. Fix nfse_config: public → authenticated
DROP POLICY IF EXISTS "Financeiro and leaders can view nfse_config" ON nfse_config;
CREATE POLICY "Financeiro and leaders can view nfse_config"
  ON nfse_config FOR SELECT TO authenticated
  USING (is_leader_or_above(auth.uid()) OR is_financeiro(auth.uid()));

DROP POLICY IF EXISTS "Financeiro and leaders can insert nfse_config" ON nfse_config;
CREATE POLICY "Financeiro and leaders can insert nfse_config"
  ON nfse_config FOR INSERT TO authenticated
  WITH CHECK (is_financeiro(auth.uid()) OR has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Financeiro and leaders can update nfse_config" ON nfse_config;
CREATE POLICY "Financeiro and leaders can update nfse_config"
  ON nfse_config FOR UPDATE TO authenticated
  USING (is_financeiro(auth.uid()) OR has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Only admins can delete nfse_config" ON nfse_config;
CREATE POLICY "Only admins can delete nfse_config"
  ON nfse_config FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- 5. Fix clients: restrict SELECT to protect PII
DROP POLICY IF EXISTS "Authenticated users can view all clients" ON clients;
CREATE POLICY "Leaders finance and admins can view clients"
  ON clients FOR SELECT TO authenticated
  USING (is_leader_or_above(auth.uid()) OR is_financeiro(auth.uid()) OR is_coordinator_or_above(auth.uid()));