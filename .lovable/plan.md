

## Remover fallback de 2000 e adotar paginação real em `useProcesses`

### Objetivo

Eliminar o `query.limit(2000)` e tratar `useProcesses()` sem parâmetros como `{ page: 0, pageSize: 50 }`. Adaptar consumidores para que continuem funcionando: páginas que listam (Processos) ganham paginação server-side; componentes que usam `processes` como **fonte de busca/select** (form dialogs, widgets) passam a usar uma busca pontual ao invés de iterar a lista carregada.

### Mudanças

**1. `src/hooks/useProcesses.ts`**

Trocar a montagem da query:
```ts
const page = options?.page ?? 0;
const pageSize = options?.pageSize ?? 50;
const from = page * pageSize;
const to = from + pageSize - 1;

let query = supabase
  .from('processes')
  .select(`*, client:clients!id_cliente (id, nome, razao_social, tipo)`, { count: 'exact' })
  .order('numero_pasta', { ascending: false })
  .range(from, to);
```

- Remover o branch `else { query = query.limit(2000); }`.
- `queryKey` passa a ser `['processes', page, pageSize]` (já é assim hoje).
- Retorno continua expondo `processes`, `totalCount`, `isLoading`, etc.

Adicionar **dois helpers no mesmo hook**, para consumidores que precisam de um único registro ou de busca por CNJ sem carregar a página inteira:

```ts
// Busca pontual para uso em forms/widgets (Select de processos)
function useProcessById(id?: string | null) {
  return useQuery({
    queryKey: ['process', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('processes')
        .select(`*, client:clients!id_cliente (id, nome, razao_social, tipo)`)
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      return data as Process | null;
    },
  });
}

// Busca server-side para selects: por número/pasta/reclamante (limit 20)
function useProcessSearch(term: string) {
  return useQuery({
    queryKey: ['processes-search', term],
    enabled: term.trim().length >= 2,
    queryFn: async () => {
      const t = term.trim();
      const { data, error } = await supabase
        .from('processes')
        .select(`id, numero_processo, numero_pasta, reclamante_nome, area, tipo_acao, id_cliente`)
        .or(`numero_processo.ilike.%${t}%,reclamante_nome.ilike.%${t}%`)
        .order('numero_pasta', { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as Process[];
    },
  });
}

export { useProcessById, useProcessSearch };
```

**2. `src/pages/Processes.tsx` — paginação real**

- Adicionar estado `const [page, setPage] = useState(0);` e constante `pageSize = 50`.
- Trocar `useProcesses()` por `useProcesses({ page, pageSize })`.
- Receber `totalCount` e renderizar controles de paginação abaixo da tabela (Anterior/Próximo + texto "Página X de Y · N processos"). Usar componente `Pagination` já existente (`src/components/ui/pagination.tsx`).
- **IMPORTANTE**: filtros (`search`, `filterType`, `filterArea`) hoje são client-side sobre o array. Como agora só temos 50 itens por página, manter o filter client-side **apenas filtra a página atual**. Aceitamos isso como limitação conhecida nesta iteração — o campo de busca continua útil para refinar a página visível, mas para busca global o usuário precisa paginar. (Alternativa server-side fica fora do escopo; pode ser próxima iteração.)
  - Opcional incluído: resetar `page` para 0 quando `search`/`filterType`/`filterArea` mudam, para evitar resultados confusos.

**3. `src/pages/ProcessFormPage.tsx`**

Hoje faz `processes.find(p => p.id === id)` em cima da lista do hook. Substituir por busca pontual:
```ts
const { data: process } = useProcessById(isEditing ? id : null);
```
Remover `processes` do destructuring de `useProcesses(...)` — manter apenas as mutations (`createProcess`, `createProcessesBatch`, `updateProcess`).

**4. `src/components/dashboard/PrazosAtrasadosWidget.tsx`**

Faz `processes.find(p => p.id === group.process_id)` para abrir o `ProcessDetailsDialog`. Substituir por fetch sob demanda:
```ts
const [selectedProcessId, setSelectedProcessId] = useState<string | null>(null);
const { data: selectedProcess } = useProcessById(selectedProcessId);

const handleGroupClick = (group) => {
  setSelectedProcessId(group.process_id);
  setDialogOpen(true);
};
```
Remover o uso de `useProcesses()` deste componente.

**5. `src/components/solicitacoes/SolicitacaoFormDialog.tsx` e `src/components/timesheet/TimesheetFormDialog.tsx`**

Ambos renderizam `<Select>` com `processes.map(...)`. Substituir o `Select` simples por um **combobox com busca server-side** usando `useProcessSearch(term)`:

- Estrutura: `Popover` + `Command` (já existem em `src/components/ui/command.tsx` e `popover.tsx`).
- Estado local: `const [open, setOpen] = useState(false); const [term, setTerm] = useState('');`
- `useProcessSearch(term)` retorna até 20 resultados conforme o usuário digita (≥2 chars).
- Para mostrar o **processo selecionado** quando ele já estiver no form (edição), usar `useProcessById(field.value)` para buscar o label.
- Em `TimesheetFormDialog.handleProcessChange`, ao invés de `processes.find(...)`, usar o resultado do `useProcessById` ou armazenar o objeto selecionado direto do combobox (`onSelect` recebe o item).

Remover o `useProcesses()` desses dois componentes.

**6. `src/components/processes/ProcessesTable.tsx`**

Usa apenas `deleteProcess` do hook. Manter como está — as mutations não dependem de `options`, então `useProcesses()` sem args continua válido (a query interna roda com page 0/size 50, mas o componente nem lê `processes`). Sem alterações necessárias.

### Detalhes técnicos

- **Backwards compat**: `useProcesses()` sem args agora retorna 50 registros (antes: 2000). Qualquer consumidor que ainda iterar `processes` sem paginar verá só os 50 mais recentes — por isso os 4 consumidores acima são adaptados nesta mesma iteração.
- **`ImportarPautas`**: já faz lookup pontual via `.in('numero_processo', chunk)` em chunks de 500 (linhas 171-185). **Sem mudanças**.
- **`useProcessSearch`**: usa `.ilike` com `%term%`. Para volumes grandes, considerar índice GIN/trigram em `numero_processo` e `reclamante_nome` em iteração futura. Limite de 20 resultados é suficiente para combobox.
- **`useProcessById`**: usa `maybeSingle()` para tolerar id inválido sem erro.
- **Cache**: queries `['process', id]` e `['processes-search', term]` herdam os defaults novos (`staleTime: 5min`).
- **Invalidação**: as mutations já fazem `invalidateQueries({ queryKey: ['processes'] })`. Adicionar `queryClient.invalidateQueries({ queryKey: ['process'] })` em `updateProcess`/`deleteProcess` para que `useProcessById` reflita mudanças.

### Arquivos afetados

- `src/hooks/useProcesses.ts` — remover fallback, adicionar defaults, exportar `useProcessById` e `useProcessSearch`, ampliar invalidação.
- `src/pages/Processes.tsx` — paginação real (page state + controles).
- `src/pages/ProcessFormPage.tsx` — usar `useProcessById`.
- `src/components/dashboard/PrazosAtrasadosWidget.tsx` — usar `useProcessById`.
- `src/components/solicitacoes/SolicitacaoFormDialog.tsx` — combobox com `useProcessSearch` + `useProcessById`.
- `src/components/timesheet/TimesheetFormDialog.tsx` — combobox com `useProcessSearch` + `useProcessById`.
- `src/components/processes/ProcessesTable.tsx` — sem mudanças.
- `src/pages/ImportarPautas.tsx` — sem mudanças (já é pontual).

### Fora do escopo

- Filtros server-side em `Processes.tsx` (área, tipo, busca textual).
- Índices `pg_trgm` para acelerar `ilike`.
- Virtualização da tabela.
- Refatorar outros hooks (`useClients`, etc.) para o mesmo padrão.

