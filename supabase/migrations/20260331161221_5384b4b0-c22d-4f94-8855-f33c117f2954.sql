
-- Phase 1: Add new columns to clients table
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS inscricao_estadual text,
  ADD COLUMN IF NOT EXISTS inscricao_municipal text,
  ADD COLUMN IF NOT EXISTS dia_emissao_nf integer,
  ADD COLUMN IF NOT EXISTS dia_vencimento integer,
  ADD COLUMN IF NOT EXISTS aplicar_grossup boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS tipo_grossup text;

-- Phase 2: Add new columns to contract_pricing table
ALTER TABLE public.contract_pricing
  ADD COLUMN IF NOT EXISTS modalidade text,
  ADD COLUMN IF NOT EXISTS data_reajuste date,
  ADD COLUMN IF NOT EXISTS cap_valor numeric,
  ADD COLUMN IF NOT EXISTS cap_horas numeric;
