

## Vincular prazos abertos `planilha_cliente` às solicitações

### Diagnóstico

| Métrica | Valor |
|---------|-------|
| Prazos abertos `planilha_cliente` sem vínculo | **1.060** (35 já vinculados) |
| Match exato por `process_id` + `data_prazo = data_limite` | **715** |
| Sem solicitação no mesmo processo | **689** (sem match possível) |
| Mesmo processo, datas diferentes | **4** (match parcial) |

**Conclusão**: 715 de 1.060 podem ser vinculados automaticamente com alta confiança. Os 689 restantes não possuem solicitação correspondente no banco — foram criados diretamente pela planilha do cliente sem passar pelo fluxo de solicitações.

### Plano de execução

**Passo 1 — Migration SQL** para vincular os 715 registros:

```sql
UPDATE process_deadlines pd
SET solicitacao_id = sub.sol_id
FROM (
  SELECT DISTINCT ON (pd2.id)
    pd2.id AS deadline_id,
    s.id AS sol_id
  FROM process_deadlines pd2
  JOIN solicitacoes s 
    ON s.process_id = pd2.process_id
    AND s.data_limite::date = pd2.data_prazo
  WHERE pd2.source = 'planilha_cliente'
    AND pd2.is_completed = false
    AND pd2.solicitacao_id IS NULL
  ORDER BY pd2.id, s.created_at DESC
) sub
WHERE pd.id = sub.deadline_id;
```

Usa `DISTINCT ON` para resolver casos onde múltiplas solicitações coincidem — pega a mais recente.

**Passo 2 — Ajustar Edge Function `sync-email-agendamentos`** para vincular `solicitacao_id` automaticamente ao criar novos prazos (já faz parcialmente, mas garantir que o campo é sempre preenchido).

**Passo 3 — Nenhuma alteração de schema** — a FK `solicitacao_id` já existe em `process_deadlines`.

### Arquivos

| Arquivo | Ação |
|---------|------|
| Migration SQL | UPDATE em batch dos 715 registros |
| `supabase/functions/sync-email-agendamentos/index.ts` | Verificar se `solicitacao_id` é preenchido ao criar deadlines |

### Resultado

- **715 prazos** vinculados às suas solicitações de origem
- **345 prazos** permanecerão sem vínculo (689 sem solicitação + 4 com datas diferentes − 35 já vinculados) — não há solicitação correspondente para eles
- Frontend já exibe badge "Solicitação" nos prazos vinculados (implementado anteriormente)

