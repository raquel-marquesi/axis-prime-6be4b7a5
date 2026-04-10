-- Security Hardening: Activate RLS on tables with existing policies
-- This prevents unauthenticated (ANON) access while preserving 
-- functionality for logged-in users and service_role scripts.

-- Core
ALTER TABLE public.processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.economic_groups ENABLE ROW LEVEL SECURITY;

-- Operational
ALTER TABLE public.agent_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_extractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monitored_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processed_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.related_processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;

-- Finance
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_accounts_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nfse_config ENABLE ROW LEVEL SECURITY;

-- Configuration
ALTER TABLE public.custom_roles ENABLE ROW LEVEL SECURITY;
