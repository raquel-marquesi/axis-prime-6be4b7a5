
-- Fix 1: Restrict all SELECT policies from 'public' to 'authenticated' role
-- This prevents unauthenticated/anon access to sensitive data

-- processes
DROP POLICY IF EXISTS "Authenticated users can view all processes" ON public.processes;
CREATE POLICY "Authenticated users can view all processes" ON public.processes FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Leaders and above can insert processes" ON public.processes;
CREATE POLICY "Leaders and above can insert processes" ON public.processes FOR INSERT TO authenticated WITH CHECK (is_leader_or_above(auth.uid()));

DROP POLICY IF EXISTS "Leaders and above can update processes" ON public.processes;
CREATE POLICY "Leaders and above can update processes" ON public.processes FOR UPDATE TO authenticated USING (is_leader_or_above(auth.uid()));

DROP POLICY IF EXISTS "Only admins can delete processes" ON public.processes;
CREATE POLICY "Only admins can delete processes" ON public.processes FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::text));

-- accounts
DROP POLICY IF EXISTS "Authenticated users can view all accounts" ON public.accounts;
CREATE POLICY "Authenticated users can view all accounts" ON public.accounts FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Financeiro and leaders can insert accounts" ON public.accounts;
CREATE POLICY "Financeiro and leaders can insert accounts" ON public.accounts FOR INSERT TO authenticated WITH CHECK (is_leader_or_above(auth.uid()) OR is_financeiro(auth.uid()));

DROP POLICY IF EXISTS "Financeiro and leaders can update accounts" ON public.accounts;
CREATE POLICY "Financeiro and leaders can update accounts" ON public.accounts FOR UPDATE TO authenticated USING (is_leader_or_above(auth.uid()) OR is_financeiro(auth.uid()));

DROP POLICY IF EXISTS "Only admins can delete accounts" ON public.accounts;
CREATE POLICY "Only admins can delete accounts" ON public.accounts FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::text));

-- agent_executions
DROP POLICY IF EXISTS "Authenticated users can view all agent executions" ON public.agent_executions;
CREATE POLICY "Authenticated users can view all agent executions" ON public.agent_executions FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Leaders and above can insert agent executions" ON public.agent_executions;
CREATE POLICY "Leaders and above can insert agent executions" ON public.agent_executions FOR INSERT TO authenticated WITH CHECK (is_leader_or_above(auth.uid()));

DROP POLICY IF EXISTS "Leaders and above can update agent executions" ON public.agent_executions;
CREATE POLICY "Leaders and above can update agent executions" ON public.agent_executions FOR UPDATE TO authenticated USING (is_leader_or_above(auth.uid()));

DROP POLICY IF EXISTS "Only admins can delete agent executions" ON public.agent_executions;
CREATE POLICY "Only admins can delete agent executions" ON public.agent_executions FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::text));

-- contract_extractions
DROP POLICY IF EXISTS "Authenticated users can view all extractions" ON public.contract_extractions;
CREATE POLICY "Authenticated users can view all extractions" ON public.contract_extractions FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Leaders and above can insert extractions" ON public.contract_extractions;
CREATE POLICY "Leaders and above can insert extractions" ON public.contract_extractions FOR INSERT TO authenticated WITH CHECK (is_leader_or_above(auth.uid()));

DROP POLICY IF EXISTS "Leaders and above can update extractions" ON public.contract_extractions;
CREATE POLICY "Leaders and above can update extractions" ON public.contract_extractions FOR UPDATE TO authenticated USING (is_leader_or_above(auth.uid()));

DROP POLICY IF EXISTS "Only admins can delete extractions" ON public.contract_extractions;
CREATE POLICY "Only admins can delete extractions" ON public.contract_extractions FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::text));

-- contract_keys
DROP POLICY IF EXISTS "Authenticated users can view contract_keys" ON public.contract_keys;
CREATE POLICY "Authenticated users can view contract_keys" ON public.contract_keys FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Leaders and above can insert contract_keys" ON public.contract_keys;
CREATE POLICY "Leaders and above can insert contract_keys" ON public.contract_keys FOR INSERT TO authenticated WITH CHECK (is_leader_or_above(auth.uid()));

DROP POLICY IF EXISTS "Leaders and above can update contract_keys" ON public.contract_keys;
CREATE POLICY "Leaders and above can update contract_keys" ON public.contract_keys FOR UPDATE TO authenticated USING (is_leader_or_above(auth.uid()));

DROP POLICY IF EXISTS "Only admins can delete contract_keys" ON public.contract_keys;
CREATE POLICY "Only admins can delete contract_keys" ON public.contract_keys FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::text));

-- economic_groups
DROP POLICY IF EXISTS "Authenticated users can view economic_groups" ON public.economic_groups;
CREATE POLICY "Authenticated users can view economic_groups" ON public.economic_groups FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Leaders and above can insert economic_groups" ON public.economic_groups;
CREATE POLICY "Leaders and above can insert economic_groups" ON public.economic_groups FOR INSERT TO authenticated WITH CHECK (is_leader_or_above(auth.uid()));

DROP POLICY IF EXISTS "Leaders and above can update economic_groups" ON public.economic_groups;
CREATE POLICY "Leaders and above can update economic_groups" ON public.economic_groups FOR UPDATE TO authenticated USING (is_leader_or_above(auth.uid()));

DROP POLICY IF EXISTS "Only admins can delete economic_groups" ON public.economic_groups;
CREATE POLICY "Only admins can delete economic_groups" ON public.economic_groups FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::text));

-- monitored_emails
DROP POLICY IF EXISTS "Authenticated users can view monitored_emails" ON public.monitored_emails;
CREATE POLICY "Authenticated users can view monitored_emails" ON public.monitored_emails FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Only admins can insert monitored_emails" ON public.monitored_emails;
CREATE POLICY "Only admins can insert monitored_emails" ON public.monitored_emails FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::text));

DROP POLICY IF EXISTS "Only admins can update monitored_emails" ON public.monitored_emails;
CREATE POLICY "Only admins can update monitored_emails" ON public.monitored_emails FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::text));

DROP POLICY IF EXISTS "Only admins can delete monitored_emails" ON public.monitored_emails;
CREATE POLICY "Only admins can delete monitored_emails" ON public.monitored_emails FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::text));

-- processed_files
DROP POLICY IF EXISTS "Authenticated users can view all processed files" ON public.processed_files;
CREATE POLICY "Authenticated users can view all processed files" ON public.processed_files FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Leaders and above can insert processed files" ON public.processed_files;
CREATE POLICY "Leaders and above can insert processed files" ON public.processed_files FOR INSERT TO authenticated WITH CHECK (is_leader_or_above(auth.uid()));

DROP POLICY IF EXISTS "Leaders and above can update processed files" ON public.processed_files;
CREATE POLICY "Leaders and above can update processed files" ON public.processed_files FOR UPDATE TO authenticated USING (is_leader_or_above(auth.uid()));

DROP POLICY IF EXISTS "Only admins can delete processed files" ON public.processed_files;
CREATE POLICY "Only admins can delete processed files" ON public.processed_files FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::text));

-- related_processes
DROP POLICY IF EXISTS "Authenticated users can view all related processes" ON public.related_processes;
CREATE POLICY "Authenticated users can view all related processes" ON public.related_processes FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Leaders and above can insert related processes" ON public.related_processes;
CREATE POLICY "Leaders and above can insert related processes" ON public.related_processes FOR INSERT TO authenticated WITH CHECK (is_leader_or_above(auth.uid()));

DROP POLICY IF EXISTS "Leaders and above can update related processes" ON public.related_processes;
CREATE POLICY "Leaders and above can update related processes" ON public.related_processes FOR UPDATE TO authenticated USING (is_leader_or_above(auth.uid()));

DROP POLICY IF EXISTS "Only admins can delete related processes" ON public.related_processes;
CREATE POLICY "Only admins can delete related processes" ON public.related_processes FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::text));

-- Fix 2: Enable RLS and add policies for historico_axis
ALTER TABLE public.historico_axis ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view historico_axis" ON public.historico_axis;
CREATE POLICY "Authenticated users can view historico_axis"
ON public.historico_axis FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Leaders can insert historico_axis" ON public.historico_axis;
CREATE POLICY "Leaders can insert historico_axis"
ON public.historico_axis FOR INSERT
TO authenticated
WITH CHECK (is_leader_or_above(auth.uid()));

DROP POLICY IF EXISTS "Leaders can update historico_axis" ON public.historico_axis;
CREATE POLICY "Leaders can update historico_axis"
ON public.historico_axis FOR UPDATE
TO authenticated
USING (is_leader_or_above(auth.uid()));

DROP POLICY IF EXISTS "Only admins can delete historico_axis" ON public.historico_axis;
CREATE POLICY "Only admins can delete historico_axis"
ON public.historico_axis FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::text));
