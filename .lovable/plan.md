

## Deduplicação de Prazos Processuais

### Situação atual

A tabela `process_deadlines` possui **45.826 registros**, dos quais **~43.876 são duplicatas** (mesmo `process_id` + `data_prazo` + `ocorrencia`). Há casos extremos com mais de 1.600 cópias do mesmo prazo. A grande maioria (45.585) vem da source `planilha_cliente`.

**Causa raiz**: As funções `sync-solicitacoes-sheet` e `sync-email-agendamentos` fazem dedup por `(process_id, data_prazo)` ignorando `ocorrencia`, mas a `sync-deadlines` (chamada pelo Google Apps Script) faz dedup por `(process_id, data_prazo, ocorrencia, is_completed=false)`. Se o script roda múltiplas vezes com ligeiras variações no texto da ocorrência, ou se `is_completed` muda, cria duplicatas. Além disso, não há constraint de unicidade na tabela.

### Plano

#### 1. Limpeza das duplicatas existentes (migration SQL)

Executar uma migration que:
- Para cada grupo `(process_id, data_prazo, ocorrencia)`, mantém apenas o registro mais recente (`MAX(created_at)`) e deleta os demais.
- Resultado esperado: redução de ~45k para ~2k registros.

```sql
DELETE FROM process_deadlines
WHERE id NOT IN (
  SELECT DISTINCT ON (process_id, data_prazo, ocorrencia)
    id
  FROM process_deadlines
  ORDER BY process_id, data_prazo, ocorrencia, created_at DESC
);
```

#### 2. Adicionar constraint de unicidade (migration SQL)

Criar um índice único para prevenir futuras duplicatas:

```sql
CREATE UNIQUE INDEX IF NOT EXISTS uq_deadline_process_date_ocorrencia
ON process_deadlines (process_id, data_prazo, ocorrencia)
WHERE is_completed = false;
```

Isso garante que, para prazos não concluídos, não pode existir duplicata do mesmo processo + data + ocorrência.

#### 3. Atualizar edge functions para usar UPSERT

Alterar as 4 funções que inserem prazos para usar `upsert` com `onConflict` em vez de `insert`, prevenindo erros de constraint:

- **`sync-pautas-github/index.ts`** (linha ~547): trocar `.insert(...)` por `.upsert(..., { onConflict: 'process_id,data_prazo,ocorrencia' })` com filtro `is_completed=false`
- **`sync-solicitacoes-sheet/index.ts`** (linha ~437): idem
- **`sync-email-agendamentos/index.ts`** (linha ~410): idem
- **`sync-deadlines/index.ts`** (linha ~344): já faz dedup manual — apenas garantir que a query de dedup remove o filtro `is_completed` para ser mais abrangente

#### 4. Verificação no frontend

Nenhuma alteração necessária no frontend — os hooks `useAllProcessDeadlines` e `useProcessDeadlines` já consomem os dados corretamente. A limpeza das duplicatas resolverá a exibição.

### Resumo técnico

| Etapa | Tipo | Arquivos |
|-------|------|----------|
| Limpeza duplicatas | Migration SQL (DELETE) | — |
| Constraint unicidade | Migration SQL (CREATE INDEX) | — |
| Upsert nas functions | Edge function code | 4 arquivos em `supabase/functions/` |

