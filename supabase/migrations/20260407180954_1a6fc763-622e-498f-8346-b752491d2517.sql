DROP POLICY IF EXISTS "Authenticated users can view all client documents" ON client_documents;
CREATE POLICY "Authenticated users can view all client documents"
  ON client_documents FOR SELECT
  TO authenticated
  USING (true);