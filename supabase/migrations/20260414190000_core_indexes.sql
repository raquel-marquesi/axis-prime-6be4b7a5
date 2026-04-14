-- ============================================================
-- Migration: Core Indexes para Performance
-- Objetiva otimizar as consultas principais do timesheet, dashboard,
-- relatorios de produtividade e buscas financeiras, evitando
-- sequential scans em bases muito grandes
-- ============================================================

-- 1. Timesheet Entries
-- Consultas comuns: onde user_id X e data Y, ou client_id X e data Y
CREATE INDEX IF NOT EXISTS idx_timesheet_user_date 
ON public.timesheet_entries (user_id, data_atividade);

CREATE INDEX IF NOT EXISTS idx_timesheet_client_date 
ON public.timesheet_entries (client_id, data_atividade)
WHERE client_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_timesheet_process 
ON public.timesheet_entries (process_id)
WHERE process_id IS NOT NULL;

-- 2. Process Deadlines
-- Consultas comuns: deadlines ativos por prazo, ou abertos por usuario
CREATE INDEX IF NOT EXISTS idx_deadlines_active_by_date 
ON public.process_deadlines (is_completed, data_prazo)
WHERE is_completed = false;

CREATE INDEX IF NOT EXISTS idx_deadlines_assigned_to 
ON public.process_deadlines (assigned_to, is_completed);

CREATE INDEX IF NOT EXISTS idx_deadlines_process_id 
ON public.process_deadlines (process_id, is_completed);

-- 3. Processes
-- Consultas comuns: buscar processos por cliente
CREATE INDEX IF NOT EXISTS idx_processes_client 
ON public.processes (id_cliente);

-- 4. Financeiro (Invoices e Expenses)
-- Consultas comuns: filtering por data de vencimento / emissao e status
CREATE INDEX IF NOT EXISTS idx_invoices_date_status 
ON public.invoices (data_vencimento, status);

CREATE INDEX IF NOT EXISTS idx_invoices_emissao 
ON public.invoices (data_emissao) 
WHERE status = 'emitida';

CREATE INDEX IF NOT EXISTS idx_expenses_date_status 
ON public.expenses (data_vencimento, status);

CREATE INDEX IF NOT EXISTS idx_expenses_pagamento 
ON public.expenses (COALESCE(data_pagamento, data_vencimento));
