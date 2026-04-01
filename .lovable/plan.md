

## Sincronizar timesheet_entries com prazos abertos

### Diagnóstico

| Métrica | Valor |
|---------|-------|
| Prazos abertos (is_completed = false) | **1.395** |
| Prazos com match em timesheet (mesmo processo, ±30 dias) | **190** |
| Match com mesmo usuário (assigned_to = user_id) | **93** |
| Mismatch (outra pessoa fez o trabalho) | **82** |
| Prazo sem assigned_to | **15** |
| Usuários sem perfil | **0** (todos existem em profiles) |

### Situação dos mismatches

Os 82 casos de "mismatch" são situações onde o prazo foi atribuído a uma pessoa, mas outra realizou a atividade no timesheet. Exemplos: prazo atribuído a Marcos Vinícius mas executado por Rodrigo Eduardo (4 casos), atribuído a Kleber mas feito por Matheus (3 casos). Isso é normal em equipes com remanejamento.

### Plano de execução (Migration SQL)

**Etapa 1 — Fechar os 190 prazos e vincular ao timesheet**

Para cada prazo aberto que tenha uma entrada de timesheet no mesmo processo dentro de ±30 dias:

1. Marcar `is_completed = true`
2. Definir `completed_at` com a data da atividade do timesheet
3. Vincular `timesheet_entry_id` ao registro mais próximo por data
4. Definir `completed_by` com o `user_id` do timesheet (quem de fato executou)
5. Para os 15 sem `assigned_to`, preencher com o `user_id` do timesheet
6. Para os 82 mismatches, manter o `assigned_to` original (quem era responsável) mas registrar `completed_by` como quem executou

**Lógica SQL:**

```sql
WITH best_match AS (
  SELECT DISTINCT ON (pd.id)
    pd.id as deadline_id,
    te.id as te_id,
    te.user_id as te_user_id,
    te.data_atividade,
    pd.assigned_to
  FROM process_deadlines pd
  JOIN timesheet_entries te ON te.process_id = pd.process_id
    AND te.data_atividade BETWEEN pd.data_prazo - 30 AND pd.data_prazo + 30
  WHERE pd.is_completed = false
  ORDER BY pd.id, ABS(te.data_atividade - pd.data_prazo) ASC
)
UPDATE process_deadlines pd SET
  is_completed = true,
  completed_at = bm.data_atividade::timestamptz,
  completed_by = bm.te_user_id,
  timesheet_entry_id = bm.te_id,
  assigned_to = COALESCE(pd.assigned_to, bm.te_user_id)
FROM best_match bm
WHERE pd.id = bm.deadline_id;
```

**Etapa 2 — Verificação pós-execução**

Query para confirmar:
- Quantos prazos foram fechados
- Distribuição por status de match (assigned = completed_by vs diferente)
- Quantos prazos abertos restam

### O que NÃO muda

- Nenhum arquivo de frontend (a coluna `timesheet_entry_id` e `completed_by` já são lidas pelo frontend)
- Nenhuma Edge Function modificada
- Nenhum dado de timesheet alterado

### Resultado esperado

- **190 prazos** fechados e vinculados ao timesheet
- **1.205 prazos** permanecem abertos (sem match no timesheet)
- Histórico de quem executou cada prazo preservado via `completed_by`

