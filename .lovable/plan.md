

## Deduplicação de Clientes

### Diagnóstico

- **18 pares** de duplicatas verdadeiras (mesmo nome, sem CNPJ, registros idênticos) — 18 registros a eliminar
- **14 grupos** com mesma razão social mas CNPJs diferentes — são filiais legítimas, não devem ser mesclados

### Plano

**Etapa 1 — Migration SQL: Mesclar duplicatas verdadeiras**

Para cada par sem documento:
1. Identificar o registro mais antigo (`created_at`) como canônico
2. Migrar referências do duplicado para o canônico:
   - `processes.client_id`
   - `timesheet_entries.client_id` (se existir)
   - `process_deadlines` (via process)
   - `client_branches`
   - `client_contacts`
   - `billing_previews.client_id`
   - `contract_pricing.client_id`
3. Deletar o registro duplicado

**Etapa 2 — Adicionar proteção contra futuras duplicatas**

Criar um índice parcial unique na tabela `clients`:
```sql
CREATE UNIQUE INDEX idx_clients_unique_razao_social_no_doc
ON clients (UPPER(TRIM(razao_social)))
WHERE cnpj IS NULL AND cpf IS NULL AND is_active = true;
```

Isso impede criação de clientes com mesmo nome quando não há documento.

### Arquivos

| Arquivo | Ação |
|---------|------|
| Migration SQL | Consolidar 18 pares duplicados + índice de proteção |

### Resultado

- 18 registros duplicados eliminados
- Referências (processos, prazos, timesheet, contratos) preservadas no registro canônico
- Proteção contra recriação futura de duplicatas sem documento

