
DO $$
DECLARE
  v_pair RECORD;
  v_keep_id uuid;
  v_dup_id uuid;
BEGIN
  FOR v_pair IN
    WITH dupes AS (
      SELECT UPPER(TRIM(razao_social)) as nome_upper,
             array_agg(id ORDER BY created_at) as ids
      FROM clients
      WHERE (is_active = true OR is_active IS NULL)
        AND razao_social IS NOT NULL
        AND cnpj IS NULL AND cpf IS NULL
      GROUP BY UPPER(TRIM(razao_social))
      HAVING count(*) > 1
    )
    SELECT nome_upper, ids[1] as keep_id, unnest(ids[2:]) as dup_id
    FROM dupes
  LOOP
    v_keep_id := v_pair.keep_id;
    v_dup_id := v_pair.dup_id;

    -- Migrar TODAS as FKs
    UPDATE processes SET id_cliente = v_keep_id WHERE id_cliente = v_dup_id;
    UPDATE timesheet_entries SET client_id = v_keep_id WHERE client_id = v_dup_id;
    UPDATE billing_previews SET client_id = v_keep_id WHERE client_id = v_dup_id;
    UPDATE contract_pricing SET client_id = v_keep_id WHERE client_id = v_dup_id;
    UPDATE invoices SET client_id = v_keep_id WHERE client_id = v_dup_id;
    UPDATE contract_extractions SET client_id = v_keep_id WHERE client_id = v_dup_id;
    UPDATE client_contacts SET client_id = v_keep_id WHERE client_id = v_dup_id;
    UPDATE client_documents SET client_id = v_keep_id WHERE client_id = v_dup_id;
    UPDATE client_sla_rules SET client_id = v_keep_id WHERE client_id = v_dup_id;
    UPDATE client_aliases SET client_id = v_keep_id WHERE client_id = v_dup_id;

    -- client_branches: remover conflitos antes
    DELETE FROM client_branches WHERE client_id = v_dup_id AND branch_id IN (
      SELECT branch_id FROM client_branches WHERE client_id = v_keep_id
    );
    UPDATE client_branches SET client_id = v_keep_id WHERE client_id = v_dup_id;

    -- team_clients: remover conflitos
    DELETE FROM team_clients WHERE client_id = v_dup_id AND team_lead_id IN (
      SELECT team_lead_id FROM team_clients WHERE client_id = v_keep_id
    );
    UPDATE team_clients SET client_id = v_keep_id WHERE client_id = v_dup_id;

    DELETE FROM clients WHERE id = v_dup_id;
  END LOOP;
END;
$$;

-- Limpar registros vazios sem referências
DELETE FROM clients 
WHERE razao_social IS NULL AND nome IS NULL AND cnpj IS NULL AND cpf IS NULL
  AND NOT EXISTS (SELECT 1 FROM processes WHERE id_cliente = clients.id)
  AND NOT EXISTS (SELECT 1 FROM timesheet_entries WHERE client_id = clients.id);

-- Índice de proteção
CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_unique_razao_social_no_doc
ON clients (UPPER(TRIM(razao_social)))
WHERE cnpj IS NULL AND cpf IS NULL AND (is_active = true OR is_active IS NULL);
