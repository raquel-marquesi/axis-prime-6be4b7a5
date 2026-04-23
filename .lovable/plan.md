

## Adicionar deduplicação ao `createProcessesBatch` em `useProcesses.ts`

### Objetivo

Evitar erros de violação de constraint UNIQUE (`numero_processo`) durante importação em lote, fazendo um pre-check no banco e pulando processos já existentes. Retornar um resumo `{ inserted, skipped, errors }` e refletir isso no toast.

### Mudanças em `src/hooks/useProcesses.ts`

**1. Reescrever `createProcessesBatch.mutationFn`**:

- Normalizar a lista de `numero_processo` da entrada (trim + filtro de vazios).
- **Pre-check em batch** (1 query, evita N+1):
  ```ts
  const { data: existing } = await supabase
    .from('processes')
    .select('numero_processo')
    .in('numero_processo', uniqueNumeros);
  ```
- Construir `Set<string>` com os números existentes.
- Particionar a lista de entrada:
  - `toInsert` → não estão no Set.
  - `skipped` → estão no Set (contador apenas, não vão pro insert).
- Buscar `user_id` uma vez via `supabase.auth.getUser()`.
- Inserir apenas `toInsert` com `.insert(...).select()`.
  - Se a lista vazia: pular o insert e retornar imediatamente.
- Capturar o `error` do insert sem `throw` para poder contar erros vs. inseridos:
  - Se `error` → contar TODA a `toInsert.length` como `errors` (insert é atômico) e propagar a mensagem para o toast de erro.
  - Se sucesso → `inserted = data.length`.
- **Retornar** `{ inserted, skipped, errors, insertedRows }`.

**2. Atualizar `onSuccess`**:

- Invalidar `['processes']` (mantém).
- Toast com resumo:
  - Título: `'Importação concluída'`
  - Description: `` `${inserted} inseridos · ${skipped} já existiam · ${errors} erros` ``
  - Se `errors > 0`, usar `variant: 'destructive'`; se `inserted === 0 && skipped > 0`, manter padrão e ajustar título para `'Nenhum processo novo'`.

**3. Manter `onError`** para falhas que escapem do `mutationFn` (ex.: erro na query de pre-check ou no `auth.getUser`).

### Snippet de referência

```ts
const createProcessesBatch = useMutation({
  mutationFn: async (processesList: ProcessFormData[]) => {
    const normalized = processesList
      .map(p => ({ ...p, numero_processo: p.numero_processo?.trim() }))
      .filter(p => p.numero_processo);

    const uniqueNumeros = Array.from(new Set(normalized.map(p => p.numero_processo)));

    const { data: existing, error: checkError } = await supabase
      .from('processes')
      .select('numero_processo')
      .in('numero_processo', uniqueNumeros);
    if (checkError) throw checkError;

    const existingSet = new Set((existing ?? []).map(r => r.numero_processo));
    const toInsert = normalized.filter(p => !existingSet.has(p.numero_processo));
    const skipped = normalized.length - toInsert.length;

    if (toInsert.length === 0) {
      return { inserted: 0, skipped, errors: 0, insertedRows: [] };
    }

    const { data: user } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('processes')
      .insert(toInsert.map(p => ({ ...p, created_by: user.user?.id })))
      .select();

    if (error) {
      return { inserted: 0, skipped, errors: toInsert.length, insertedRows: [], errorMessage: error.message };
    }
    return { inserted: data.length, skipped, errors: 0, insertedRows: data };
  },
  onSuccess: ({ inserted, skipped, errors, errorMessage }) => {
    queryClient.invalidateQueries({ queryKey: ['processes'] });
    if (errors > 0) {
      toast({
        title: 'Importação com erros',
        description: `${inserted} inseridos · ${skipped} já existiam · ${errors} erros${errorMessage ? ` (${errorMessage})` : ''}`,
        variant: 'destructive',
      });
    } else if (inserted === 0 && skipped > 0) {
      toast({ title: 'Nenhum processo novo', description: `${skipped} já existiam no sistema` });
    } else {
      toast({ title: 'Importação concluída', description: `${inserted} inseridos · ${skipped} já existiam` });
    }
  },
  onError: (error: Error) => {
    toast({ title: 'Erro ao importar', description: error.message, variant: 'destructive' });
  },
});
```

### Detalhes técnicos

- **Deduplicação interna**: `Set` no `uniqueNumeros` previne que linhas duplicadas dentro do mesmo arquivo gerem queries inflamadas. Linhas duplicadas dentro do batch são tratadas implicitamente — a primeira ocorrência entra em `toInsert`, as demais ficam fora porque o `numero_processo` aparece no `existingSet` após o primeiro insert (não é o caso aqui pois o pre-check é único). Para garantir que duplicatas internas também sejam puladas, adiciona-se um `seen = new Set()` no filter de `toInsert`. **Decisão**: incluir esse filtro extra para robustez.
- **Atomicidade do insert**: o Supabase faz `.insert([...])` em uma única transação; se uma linha violar constraint, todas falham. Por isso, em caso de erro, todas as `toInsert.length` linhas são contadas como `errors` (não dá para parcializar sem fazer N inserts individuais — fora do escopo).
- **Upsert opcional**: o pedido menciona "ou opcionalmente atualizados via upsert". **Decisão**: NÃO usar upsert — a semântica padrão é "ignorar duplicados", consistente com o comportamento dos syncs (`mem://logic/auto-process-creation`). Se o usuário quiser update, é uma feature separada (ex.: flag `mode: 'skip' | 'update'`).
- **Tipo de retorno**: muda de `data` (array) para `{ inserted, skipped, errors, insertedRows }`. Único consumidor atual é `BatchImportClientsDialog.tsx`? Verificar — se algum chamador usa o array bruto, precisa adaptar para `.insertedRows`.

### Arquivos afetados

- `src/hooks/useProcesses.ts` — única edição.
- Possível ajuste em consumidores que dependem do retorno antigo de `createProcessesBatch.mutateAsync` (a verificar antes de aplicar).

### Fora do escopo

- Modo "upsert" (atualizar processos existentes em vez de pular).
- Insert linha-a-linha para isolar erros individuais.
- UI de preview antes de importar.
- Aplicar a mesma lógica em outros hooks (`useClients`, etc.).

