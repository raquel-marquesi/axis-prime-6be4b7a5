

## Adicionar mutations `updateInvoice` e `deleteInvoice` em `useInvoices.ts`

### Objetivo
Estender o hook `useInvoices` com as operações de atualização e exclusão de faturas, seguindo exatamente o padrão já consolidado em `useClients.ts`.

### Mudanças em `src/hooks/useInvoices.ts`

**1. Adicionar `updateInvoice`** (logo após `createInvoice`):
- Assinatura: `({ id, ...formData }: any & { id: string })`
- Operação: `supabase.from('invoices').update(formData).eq('id', id).select().single()`
- `onSuccess`: invalida `['invoices']` + toast `'Faturamento atualizado'`
- `onError`: toast `'Erro ao atualizar'` com `variant: 'destructive'`

**2. Adicionar `deleteInvoice`** (logo após `updateInvoice`):
- Assinatura: `(id: string)`
- Operação: `supabase.from('invoices').delete().eq('id', id)`
- `onSuccess`: invalida `['invoices']` + toast `'Faturamento excluído'`
- `onError`: toast `'Erro ao excluir'` com `variant: 'destructive'`

**3. Atualizar o `return`** do hook para expor ambas:
```ts
return { invoices, isLoading, createInvoice, updateInvoice, deleteInvoice };
```

### Snippet (referência)

```ts
const updateInvoice = useMutation({
  mutationFn: async ({ id, ...formData }: any & { id: string }) => {
    const { data, error } = await supabase
      .from('invoices').update(formData).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['invoices'] });
    toast({ title: 'Faturamento atualizado' });
  },
  onError: (error: Error) => {
    toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
  },
});

const deleteInvoice = useMutation({
  mutationFn: async (id: string) => {
    const { error } = await supabase.from('invoices').delete().eq('id', id);
    if (error) throw error;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['invoices'] });
    toast({ title: 'Faturamento excluído' });
  },
  onError: (error: Error) => {
    toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
  },
});
```

### Detalhes técnicos
- `useToast` e `useQueryClient` já estão importados — sem novos imports.
- RLS de `invoices` já permite update/delete para usuários autorizados; nenhuma migration necessária.
- Nenhum componente consumidor é alterado neste passo — as mutations ficam disponíveis para uso futuro (ex.: `InvoiceFormDialog` em modo edição, botão de excluir em `InvoicesTable`).

### Arquivos afetados
- `src/hooks/useInvoices.ts` (única edição)

### Fora do escopo
- Wireframe de UI de edição/exclusão em `InvoicesTable` ou `InvoiceFormDialog`.
- Confirmação modal antes de deletar (pode ser adicionado depois no componente que consumir `deleteInvoice`).

