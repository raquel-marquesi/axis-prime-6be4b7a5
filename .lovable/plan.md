

## Cruzamento timesheet × prazos abertos

### Diagnóstico

| Métrica | Valor |
|---------|-------|
| Prazos abertos (is_completed = false) | **1.205** |
| Prazos com match em timesheet (±30 dias) | **0** (já conciliados anteriormente) |
| Prazos com match em timesheet (±60 dias) | **61** |
| Match com mesmo usuário (assigned_to = user_id) | **7** |
| Match com outro usuário | **54** |
| Atividade APÓS o prazo (trabalho feito atrasado) | **5** |
| Atividade ANTES do prazo (trabalho feito antecipadamente) | **56** |

### Análise

A conciliação anterior com janela de ±30 dias já fechou todos os matches óbvios. Os 61 restantes estão na faixa de 31-60 dias de diferença, o que é uma correspondência mais fraca. Desses:

- **7** têm o mesmo usuário atribuído — confiança razoável
- **54** têm usuário diferente — confiança baixa, mas pode indicar que outro membro da equipe executou o trabalho
- **5** tiveram atividade registrada após a data do prazo (trabalho feito com atraso)

### Plano de execução

**Migration SQL** — Fechar os 61 prazos com match na janela de 31-60 dias, priorizando match pelo mesmo usuário e menor diferença de datas:

```sql
WITH best_match AS (
  SELECT DISTINCT ON (pd.id)
    pd.id AS deadline_id,
    te.id AS te_id,
    te.data_atividade,
    te.user_id AS te_user_id
  FROM process_deadlines pd
  JOIN timesheet_entries te ON te.process_id = pd.process_id
    AND te.data_atividade BETWEEN pd.data_prazo - 60 AND pd.data_prazo + 60
  WHERE pd.is_completed = false
  ORDER BY pd.id,
    CASE WHEN pd.assigned_to = te.user_id THEN 0 ELSE 1 END,
    ABS(te.data_atividade::date - pd.data_prazo::date)
)
UPDATE process_deadlines pd
SET is_completed = true,
    completed_at = bm.data_atividade::timestamptz,
    completed_by = bm.te_user_id,
    timesheet_entry_id = bm.te_id
FROM best_match bm
WHERE pd.id = bm.deadline_id;
```

### Arquivos

| Arquivo | Ação |
|---------|------|
| Migration SQL | UPDATE dos 61 prazos com match ±60 dias |
| Nenhum arquivo de código | Frontend já exibe prazos concluídos corretamente |

### Resultado

- **61 prazos** adicionais fechados e vinculados ao timesheet
- Prazos abertos reduzidos de **1.205** para **~1.144**
- Histórico de quem executou preservado via `completed_by`

