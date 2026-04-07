

## Auditoria: Conflitos no schema public e backend

### Problemas encontrados

| # | Problema | Impacto | Severidade |
|---|----------|---------|------------|
| 1 | Funções `reconcile_open_deadlines` e `relink_orphan_timesheet_entries` referenciam variável `p_batch_size` que **não existe** como parâmetro (ambas têm 0 argumentos) | Falham em runtime com erro de variável não definida — qualquer chamada a elas quebra | Alto |
| 2 | Overload antigo de `get_prazos_rows(text, ...)` referencia `p_status_filter` (singular) mas o parâmetro se chama `p_status_filters` (plural) | Query de contagem nunca filtra por status corretamente nessa overload | Médio |
| 3 | Overload antigo de `get_prazos_rows(text, ...)` usa `p_assigned_to` mas a overload nova usa `p_responsavel_id` — duas versões coexistem com assinaturas diferentes | Confusão sobre qual o frontend chama; a antiga não tem controle de acesso por role/equipe | Médio |
| 4 | Overload antigo de `get_prazos_summary(text, ...)` também coexiste com a versão nova `(date, ...)` — mesma duplicação | Mesma confusão | Baixo |
| 5 | `PremiacaoList` não usa `forwardRef` mas recebe ref via Tabs — gera warnings no console | Warning visível, sem crash | Baixo |

### Plano de correção

#### 1. Corrigir `reconcile_open_deadlines` — adicionar parâmetro `p_batch_size`

Migration SQL:
```sql
CREATE OR REPLACE FUNCTION public.reconcile_open_deadlines(p_batch_size integer DEFAULT 1000)
-- ... corpo existente mantido, agora p_batch_size resolve corretamente
```

#### 2. Corrigir `relink_orphan_timesheet_entries` — adicionar parâmetro `p_batch_size`

```sql
CREATE OR REPLACE FUNCTION public.relink_orphan_timesheet_entries(p_batch_size integer DEFAULT 1000)
-- ... corpo existente mantido
```

#### 3. Remover overloads antigos de `get_prazos_rows(text, ...)` e `get_prazos_summary(text, ...)`

A versão `(date, ...)` é a correta e inclui controle de acesso por role. As versões `(text, ...)` são legadas e contêm bugs (`p_status_filter` vs `p_status_filters`, sem filtro de equipe).

```sql
DROP FUNCTION IF EXISTS public.get_prazos_rows(text, uuid, integer, integer, text, text[]);
DROP FUNCTION IF EXISTS public.get_prazos_summary(text, uuid);
```

#### 4. Verificar que o frontend chama as versões corretas

Confirmar em `usePrazosReport.ts` e `useSolicitacoes.ts` que as chamadas RPC usam `date` e não `text` para o parâmetro de mês.

### Arquivos afetados

| Arquivo | Ação |
|---------|------|
| Migration SQL | Criar — corrige 4 funções, remove 2 overloads |
| Frontend | Verificar — confirmar chamadas RPC usam date |

### Resultado

- Funções de reconciliação e relink voltam a funcionar
- Sem overloads conflitantes nas funções de prazos
- Console warnings de Premiação ficam para uma correção separada (cosmético)

