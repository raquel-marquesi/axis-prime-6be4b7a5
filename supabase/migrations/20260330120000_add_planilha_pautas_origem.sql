
-- Add 'planilha_pautas' value to origem_solicitacao enum
-- This supports the new sync-pautas-github edge function that reads
-- the 'Pautas' spreadsheet and routes rows to Supabase + GitHub Issues.
DO $$
BEGIN
  ALTER TYPE origem_solicitacao ADD VALUE IF NOT EXISTS 'planilha_pautas';
EXCEPTION WHEN undefined_object THEN
  NULL;
END $$;
