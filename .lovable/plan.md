

## Configurar QueryClient e expor `isPending` das mutations

### Objetivo

1. Reduzir refetches desnecessários configurando defaults sãos no `QueryClient`.
2. Expor `isPending` de cada mutation `create`/`update`/`delete` em `useClients`, `useProcesses` e `useSolicitacoes`, para que os componentes possam desabilitar botões durante a operação.

### Mudanças

**1. `src/App.tsx`**

Substituir:
```ts
const queryClient = new QueryClient();
```
por:
```ts
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,      // 5 min
      gcTime: 1000 * 60 * 10,        // 10 min
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
```

Sem outras alterações no arquivo.

**2. `src/hooks/useClients.ts`**

No objeto de retorno do hook, adicionar flags `isPending` para cada mutation existente. Padrão:
```ts
return {
  // ...campos atuais (clients, isLoading, etc.)
  createClient,
  updateClient,
  deleteClient,
  isCreating: createClient.isPending,
  isUpdating: updateClient.isPending,
  isDeleting: deleteClient.isPending,
};
```
Os nomes exatos serão alinhados às mutations realmente existentes no arquivo (verificadas durante a edição). Se houver mutations adicionais (ex.: `createBillingContact`, `linkClient`), também receberão flag `isPending` correspondente.

**3. `src/hooks/useProcesses.ts`**

Mesmo padrão. Mutations a expor:
- `createProcess` → `isCreating`
- `updateProcess` → `isUpdating`
- `deleteProcess` → `isDeleting`
- `createProcessesBatch` → `isImporting`

**4. `src/hooks/useSolicitacoes.ts`**

- `createSolicitacao` → `isCreating`
- `updateSolicitacao` → `isUpdating`
- `deleteSolicitacao` → `isDeleting`
- `updateStatus` → `isUpdatingStatus`

### Detalhes técnicos

- `isPending` é a propriedade nativa do TanStack Query v5 para `useMutation`. Já está disponível em cada objeto de mutation — apenas re-exportamos como flag de conveniência. Assim, consumidores podem fazer `<Button disabled={isCreating}>` sem precisar acessar `createClient.isPending` (que também continua acessível, retrocompatível).
- Como o objeto da mutation continua sendo retornado, **nenhum consumidor existente quebra** — isto é uma adição não-destrutiva.
- `staleTime: 5min` significa que dados não serão refetchados automaticamente nesse intervalo; mutations existentes já chamam `queryClient.invalidateQueries(...)` em `onSuccess`, então atualizações continuam imediatas após uma escrita.
- `gcTime: 10min` (substitui `cacheTime` em v5) mantém dados não-utilizados em cache por 10 min antes de descartar.
- `retry: 1` reduz spam de retries em erros transitórios; suficiente para a maioria dos casos sem mascarar bugs.

### Arquivos afetados

- `src/App.tsx`
- `src/hooks/useClients.ts`
- `src/hooks/useProcesses.ts`
- `src/hooks/useSolicitacoes.ts`

### Fora do escopo

- Aplicar o mesmo padrão `isPending` aos demais hooks (`useExpenses`, `useInvoices`, `useTimesheet`, etc.) — pode ser feito em iteração separada, sob demanda.
- Refatorar componentes consumidores (`ClientFormDialog`, `ProcessFormDialog`, `SolicitacaoFormDialog`) para usar as novas flags. As flags ficam disponíveis; adoção é incremental.
- Configurar `mutations` defaults no `QueryClient` (ex.: `retry` para mutations) — mantemos apenas os defaults de `queries` conforme pedido.

