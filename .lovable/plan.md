

## Corrigir `sync-email-agendamentos`: deadlines não sendo criados

### Causa raiz

O problema é um **timeout sequencial**. A função executa três fases em série:

1. **Leitura das 52 abas** do Google Sheets (~30s)
2. **Insert de solicitações + `assign_calculation` RPC** para cada registro (chamada individual por registro → ~80-120s para 500+ registros)
3. **Criação de `process_deadlines`** para os registros inseridos

A fase 2 demora tanto que a função atinge o timeout (~150s) antes de chegar à fase 3. Nos logs:
- 1ª execução: 586 para inserir → **timeout antes dos deadlines**
- 2ª execução: 387 para inserir → **timeout antes dos deadlines**
- 3ª execução: apenas 2 novos → chegou aos deadlines mas `insertedIds` só continha 2 registros (que provavelmente não tinham `process_id` + `data_limite`)

Resultado: **78 solicitações** têm `process_id` + `data_limite` mas nenhum `process_deadline` foi criado.

### Plano de correção (2 etapas)

**Etapa 1 — Migration SQL: Criar os 78 deadlines faltantes agora**

Inserir os `process_deadlines` para as 78 solicitações `email_sheet` que têm `process_id` + `data_limite` mas sem deadline vinculado:

```sql
WITH missing AS (
  INSERT INTO process_deadlines (process_id, data_prazo, ocorrencia, detalhes, assigned_to, source, is_completed, solicitacao_id)
  SELECT
    s.process_id,
    s.data_limite::date,
    LEFT(s.titulo, 120),
    LEFT(s.descricao, 500),
    s.assigned_to,
    'planilha_cliente',
    false,
    s.id
  FROM solicitacoes s
  WHERE s.origem = 'email_sheet'
    AND s.process_id IS NOT NULL
    AND s.data_limite IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM process_deadlines pd WHERE pd.solicitacao_id = s.id
    )
  ON CONFLICT (process_id, data_prazo, ocorrencia) WHERE is_completed = false
  DO UPDATE SET solicitacao_id = EXCLUDED.solicitacao_id
  RETURNING id
)
SELECT COUNT(*) FROM missing;
```

**Etapa 2 — Refatorar a Edge Function para evitar timeout futuro**

Modificar `sync-email-agendamentos/index.ts`:

1. **Mover a criação de deadlines para dentro do loop de insert** (linhas 348-375), criando o deadline imediatamente após cada solicitação ser inserida, em vez de acumular `insertedIds` e processar depois
2. **Remover a chamada individual a `assign_calculation`** dentro do loop — usar um único UPDATE batch no final ou chamar o RPC apenas para registros com `client_id`
3. **Criar deadline inline**: logo após o insert de cada solicitação, se ela tiver `process_id` + `data_limite`, fazer o upsert do deadline ali mesmo

Estrutura simplificada:
```
for batch in toInsert:
  insert batch → solicitacoes
  for each inserted:
    assign_calculation(id)        // mantém
    if process_id + data_limite:  // NOVO: inline
      upsert process_deadline     
```

Isso garante que mesmo com timeout, os deadlines já criados ficam no banco.

### Arquivos

| Arquivo | Ação |
|---------|------|
| Migration SQL | Criar 78 deadlines faltantes para solicitações `email_sheet` |
| `supabase/functions/sync-email-agendamentos/index.ts` | Mover criação de deadlines para dentro do loop de insert (inline) |

### Resultado

- **78 deadlines** criados imediatamente via migration
- Futuras execuções criarão deadlines em tempo real, resistentes a timeout
- Total de deadlines `planilha_cliente` passará de ~1.095 para ~1.173

