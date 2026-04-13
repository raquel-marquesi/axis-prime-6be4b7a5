-- ============================================================
-- RLS Hardening (OWASP Compliance)
-- ============================================================

-- Force Enable RLS on core tables
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE processes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- Safely create policy for INVOICES
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'invoices' AND policyname = 'Allow authenticated users full access to invoices'
  ) THEN
    CREATE POLICY "Allow authenticated users full access to invoices" ON invoices
      FOR ALL TO authenticated
      USING (true) WITH CHECK (true);
  END IF;

  -- Safely create policy for EXPENSES
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'expenses' AND policyname = 'Allow authenticated users full access to expenses'
  ) THEN
    CREATE POLICY "Allow authenticated users full access to expenses" ON expenses
      FOR ALL TO authenticated
      USING (true) WITH CHECK (true);
  END IF;

  -- Safely create policy for PROCESSES
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'processes' AND policyname = 'Allow authenticated users full access to processes'
  ) THEN
    CREATE POLICY "Allow authenticated users full access to processes" ON processes
      FOR ALL TO authenticated
      USING (true) WITH CHECK (true);
  END IF;
END $$;
