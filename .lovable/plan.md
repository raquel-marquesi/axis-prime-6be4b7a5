

## Corrigir vinculação cliente × processos no Relatório de Carteira

### Causa raiz

A coluna na tabela `processes` se chama `id_cliente`, mas o relatório consulta `client_id` (que não existe). O Supabase retorna erro silencioso ou array vazio, resultando em contagem zero para todos os clientes.

### Problema secundário: limite de 1.000 registros

A query atual faz `select('client_id')` sem paginação. Com 7.465 processos, mesmo corrigindo o nome da coluna, o Supabase retornaria apenas os primeiros 1.000 registros. A solução é usar uma RPC ou agrupar no banco.

### Solução

**Arquivo: `src/components/relatorios/CarteiraReport.tsx`**

Substituir a query de contagem de processos:

**Antes** (linhas 23-35): busca todos os processos individualmente com coluna errada e conta no JS.

**Depois**: usar uma query que agrupa por `id_cliente` diretamente no banco, evitando o limite de 1.000 e corrigindo o nome da coluna. Como o Supabase JS SDK não suporta `GROUP BY`, a abordagem será chamar uma RPC.

**Alternativa sem RPC** (mais simples): criar a contagem via migration como uma view materializada ou simplesmente usar `supabase.rpc()` com uma função inline.

**Abordagem escolhida** (sem criar RPC — mínima mudança):

Trocar `client_id` por `id_cliente` na query existente e adicionar `.select('id_cliente', { count: 'exact', head: false })` — mas isso ainda tem o limite de 1.000.

**Melhor abordagem**: Criar uma função SQL `get_process_counts_by_client()` que retorna `{client_id, count}` agrupado, e chamá-la via `supabase.rpc()`.

### Plano de execução

1. **Migration SQL** — Criar função `get_process_counts_by_client`:
```sql
CREATE OR REPLACE FUNCTION get_process_counts_by_client()
RETURNS TABLE(client_id uuid, process_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT id_cliente, count(*) 
  FROM processes 
  WHERE id_cliente IS NOT NULL 
  GROUP BY id_cliente;
$$;
```

2. **`src/components/relatorios/CarteiraReport.tsx`** — Alterar a query `carteira-process-counts` para usar `supabase.rpc('get_process_counts_by_client')` e mapear o resultado em `Record<string, number>`.

### Resultado

- Todos os 7.465 processos serão contabilizados corretamente por cliente
- Sem limite de 1.000 registros
- Coluna de "Processos" no relatório mostrará valores reais

