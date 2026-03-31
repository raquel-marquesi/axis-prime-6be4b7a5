

## Implementar Opção A: Vincular `solicitacoes` → `process_deadlines` via FK

### Contexto

- `process_deadlines`: 1.950 registros (prazos operacionais com `process_id` obrigatório, controle de conclusão, calendário)
- `solicitacoes`: 3.428 registros (entrada de demandas com `client_id`, `prioridade`, `calculation_type_id`, metadados de e-mail)
- Ambas possuem `id_tarefa_externa` — 35 registros já compartilham o mesmo valor
- 770 solicitações têm `process_id` preenchido

### O que será feito

**1. Migration SQL** — Adicionar `solicitacao_id` em `process_deadlines`
```sql
ALTER TABLE process_deadlines 
  ADD COLUMN solicitacao_id UUID REFERENCES solicitacoes(id) ON DELETE SET NULL;
```
Preencher retroativamente os 35 registros que já compartilham `id_tarefa_externa`:
```sql
UPDATE process_deadlines pd
SET solicitacao_id = s.id
FROM solicitacoes s
WHERE pd.id_tarefa_externa = s.id_tarefa_externa
  AND pd.id_tarefa_externa IS NOT NULL;
```

**2. Edge Functions de sincronização** — Ao criar um `process_deadline` a partir de uma solicitação (em `sync-pautas-github`, `sync-solicitacoes-sheet`), gravar o `solicitacao_id` no deadline.

**3. Frontend — DeadlinesTab** — Na listagem de prazos do processo, se o deadline tiver `solicitacao_id`, exibir um badge/tooltip "Solicitação vinculada" com dados da origem (prioridade, cliente, tipo de cálculo).

**4. Frontend — PrazosProcessuaisTab** — Na tabela global de prazos, adicionar coluna opcional "Origem" que indica se o prazo veio de uma solicitação (com link para detalhes).

**5. Hook `useProcessDeadlines`** — Expandir a query para incluir join com `solicitacoes` quando `solicitacao_id` existir, trazendo `titulo`, `prioridade`, `client_id`.

### Arquivos

| Arquivo | Ação |
|---------|------|
| Migration SQL | Criar coluna `solicitacao_id` + backfill |
| `supabase/functions/sync-pautas-github/index.ts` | Gravar `solicitacao_id` ao criar deadline |
| `supabase/functions/sync-solicitacoes-sheet/index.ts` | Gravar `solicitacao_id` ao criar deadline |
| `src/hooks/useProcessDeadlines.ts` | Join com `solicitacoes` para trazer dados da origem |
| `src/components/processes/DeadlinesTab.tsx` | Badge "Solicitação" nos prazos vinculados |
| `src/hooks/useAllProcessDeadlines.ts` | Incluir `solicitacao_id` na query global |
| `src/components/solicitacoes/PrazosProcessuaisTab.tsx` | Coluna "Origem" na tabela |
| `src/integrations/supabase/types.ts` | Atualizado automaticamente |

### Resultado

Cada prazo processual poderá apontar para a solicitação que o originou, permitindo rastrear de onde veio a demanda (e-mail, planilha, manual) sem duplicar dados entre as duas tabelas.

