-- 1. Fix custom_roles
DROP POLICY IF EXISTS "Authenticated users can view custom_roles" ON custom_roles;
CREATE POLICY "Authenticated users can view custom_roles" ON custom_roles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins managers and finance can insert custom_roles" ON custom_roles;
CREATE POLICY "Admins managers and finance can insert custom_roles" ON custom_roles FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'gerente') OR has_role(auth.uid(), 'financeiro'));

-- 2. Fix bank_accounts_config (SELECT skipped due to remote exists)
DROP POLICY IF EXISTS "Authenticated users can view bank_accounts_config" ON bank_accounts_config;
CREATE POLICY "Finance and admins can view bank_accounts_config"
  ON bank_accounts_config FOR SELECT TO authenticated
  USING (is_financeiro(auth.uid()) OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'gerente'));

DROP POLICY IF EXISTS "Only admins can insert bank_accounts_config" ON bank_accounts_config;
CREATE POLICY "Only admins can insert bank_accounts_config" ON bank_accounts_config FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'));

-- 3. Fix contract_pricing (SELECT skipped due to remote exists)
DROP POLICY IF EXISTS "Authenticated users can view contract_pricing" ON contract_pricing;

-- 4. Fix nfse_config
DROP POLICY IF EXISTS "Financeiro and leaders can view nfse_config" ON nfse_config;
CREATE POLICY "Financeiro and leaders can view nfse_config" ON nfse_config FOR SELECT TO authenticated USING (is_leader_or_above(auth.uid()) OR is_financeiro(auth.uid()));

-- 5. Fix clients (SELECT skipped due to remote exists)
DROP POLICY IF EXISTS "Authenticated users can view all clients" ON clients;