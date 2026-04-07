

## Corrigir aba Prazos: limite de 1.000 registros do Supabase

### Diagnóstico

- `process_deadlines` tem **2.517 registros**
- O SDK do Supabase retorna no máximo **1.000 linhas** por query (padrão)
- A query em `useAllProcessDeadlines` ordena por `data_prazo ASC` sem paginação, retornando os 1.000 registros mais antigos (majoritariamente concluídos)
- Os prazos atrasados/hoje/futuro ficam de fora porque estão além da posição 1.000
- A aba Relatórios usa RPC (`get_prazos_abertos_report`) que roda no servidor sem esse limite — por isso mostra dados reais

### Solução

Criar uma **função RPC** no Postgres que retorna todos os prazos com os JOINs necessários (processes, profiles), eliminando o limite de 1.000 linhas e reduzindo o número de queries no frontend.

#### 1. Migration: criar RPC `get_all_deadlines_with_details`

A função faz o JOIN de `process_deadlines` com `processes` e retorna todas as colunas necessárias, sem limite de linhas. Aceita parâmetros opcionais de filtro (`p_date_from`, `p_date_to`, `p_status`).

#### 2. Ajustar `useAllProcessDeadlines.ts`

Substituir a query `.from('process_deadlines').select(...)` por `supabase.rpc('get_all_deadlines_with_details', params)`. Isso elimina:
- O limite de 1.000 linhas
- A query extra para buscar nomes de usuários (o JOIN já traz)
- A query extra para buscar equipe do coordenador (filtro por `assigned_to` feito no SQL)

### Detalhes técnicos

```sql
CREATE OR REPLACE FUNCTION get_all_deadlines_with_details(
  p_user_id uuid DEFAULT NULL,
  p_team_user_ids uuid[] DEFAULT NULL,
  p_date_from date DEFAULT NULL,
  p_date_to date DEFAULT NULL
)
RETURNS TABLE (
  id uuid, process_id uuid, data_prazo date, ocorrencia text,
  detalhes text, is_completed boolean, assigned_to uuid,
  completed_by uuid, ultimo_andamento text, solicitacao_id uuid,
  numero_processo text, numero_pasta integer, reclamante_nome text,
  reclamadas text[], area text,
  assigned_user_name text, completed_by_name text,
  solicitacao_titulo text, solicitacao_prioridade text
) ...
```

### Arquivos

| Arquivo | Ação |
|---------|------|
| Migration SQL | Criar RPC `get_all_deadlines_with_details` |
| `src/hooks/useAllProcessDeadlines.ts` | Usar `supabase.rpc(...)` em vez de `.from().select()` |

### Resultado

- Cards de resumo mostram números reais (531 atrasados, 78 hoje, 378 futuros)
- Consistência total entre aba Prazos e aba Relatórios
- Performance melhor (1 query RPC em vez de 3 queries sequenciais)

