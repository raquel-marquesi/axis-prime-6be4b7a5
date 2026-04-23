

## Aplicar refatoração de `useClients.ts` com join único

O usuário colou exatamente a versão refatorada do arquivo. Aplicar essa versão sobrescrevendo `src/hooks/useClients.ts`.

### Mudança

**`src/hooks/useClients.ts`** — substituir o `queryFn` da query `['clients']` para usar uma única chamada com nested join:

```ts
.from('clients')
.select(`
  *,
  economic_groups(nome),
  contract_keys(nome),
  client_branches(branch_id, branches(nome))
`)
.order('created_at', { ascending: false });
```

E mapear:
```ts
branch_ids: (c.client_branches || []).map((cb: any) => cb.branch_id),
branch_nomes: (c.client_branches || []).map((cb: any) => cb.branches?.nome || ''),
```

Remover o segundo `supabase.from('client_branches').select(...)` e o objeto agregador `branchesByClient`.

Resto do arquivo (mutations `createClient`/`updateClient`/`deleteClient`, `checkDuplicate`, flags `isPending`, hook `useClientContacts`) permanece **idêntico** ao já existente.

### Detalhes técnicos

- **RLS**: `client_branches` e `branches` têm `SELECT` para `authenticated` (`true`) — join funciona sem ajustes.
- **Shape preservado**: `branch_ids: string[]` e `branch_nomes: string[]` continuam arrays paralelos. Interface `Client` e consumidores (`ClientsTable`, `ClientsCards`, `ClientFormDialog`, `BatchImportClientsDialog`, etc.) não mudam.
- **Performance**: 1 roundtrip ao invés de 2.
- **Campo extra `client_branches`** vem no objeto via `...c`, mas é benigno (cast `as Client[]` isola; consumidores não dependem dele).

### Arquivos afetados

- `src/hooks/useClients.ts` — única edição.

### Fora do escopo

- Refatorar `useClientContacts` ou outros hooks com padrão similar.
- Remover o campo `client_branches` extra do objeto retornado.

