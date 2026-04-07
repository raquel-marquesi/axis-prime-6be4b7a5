
-- 1. Create clients_safe view for non-finance roles (excludes banking/PII)
CREATE OR REPLACE VIEW public.clients_safe
WITH (security_invoker = true)
AS SELECT
  id, tipo, tipo_cadastro, nome, razao_social, cnpj, nome_fantasia,
  representante_legal, centro_custo, is_active, created_at, updated_at,
  created_by, canal_importacao, economic_group_id, contract_key_id,
  -- Address (not sensitive)
  cep, logradouro, numero, complemento, bairro, cidade, estado,
  -- Contract info (not sensitive)
  contrato_objeto, contrato_data_inicio, contrato_data_vencimento,
  contrato_condicoes_faturamento,
  -- Billing config (not banking)
  dia_vencimento, dia_emissao_nf, billing_reminder_days, billing_reminder_enabled,
  inscricao_municipal, inscricao_estadual,
  aplicar_grossup, tipo_grossup, metodo_pagamento,
  observacoes
FROM public.clients;

-- 2. Restrict clients SELECT to finance + admin only
DROP POLICY IF EXISTS "Leaders finance and admins can view clients" ON clients;
CREATE POLICY "Finance and admins can view clients"
  ON clients FOR SELECT TO authenticated
  USING (is_financeiro(auth.uid()) OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'gerente'));

-- 3. Restrict billing_contacts to finance + admin only
DROP POLICY IF EXISTS "Financeiro and leaders can view billing contacts" ON billing_contacts;
CREATE POLICY "Finance and admins can view billing contacts"
  ON billing_contacts FOR SELECT TO authenticated
  USING (is_financeiro(auth.uid()) OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'gerente'));

DROP POLICY IF EXISTS "Financeiro and leaders can insert billing contacts" ON billing_contacts;
CREATE POLICY "Finance and admins can insert billing contacts"
  ON billing_contacts FOR INSERT TO authenticated
  WITH CHECK (is_financeiro(auth.uid()) OR has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Financeiro and leaders can update billing contacts" ON billing_contacts;
CREATE POLICY "Finance and admins can update billing contacts"
  ON billing_contacts FOR UPDATE TO authenticated
  USING (is_financeiro(auth.uid()) OR has_role(auth.uid(), 'admin'));
