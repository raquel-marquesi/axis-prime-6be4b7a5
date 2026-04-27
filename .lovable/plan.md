## Paginação avançada na página de Processos

Hoje `/processos` tem apenas botões "Anterior / Próxima" com `PAGE_SIZE = 50` fixo. Vou adicionar:

1. **Seletor de itens por página**: 20, 50, 100.
2. **Numeração de páginas** com navegação (primeira, anterior, números, próxima, última) e elipse para muitas páginas.

### Comportamento

- Seletor "Itens por página" ao lado do contador, com valores 20 / 50 / 100 (default 50, mantendo o atual).
- Ao trocar o tamanho, a página volta para 0 (evita ficar fora do intervalo).
- Numeração estilo Google: mostra até 5 números centrados na página atual + primeira/última com `…` quando necessário.
  - Ex.: `‹ 1 … 4 5 [6] 7 8 … 42 ›`
  - Se total ≤ 7 páginas, mostra todas sem elipses.
- Botões "Primeira" e "Última" (ícones `ChevronsLeft` / `ChevronsRight`) além de Anterior/Próxima já existentes.
- Filtros (busca, área, tipo) continuam resetando para página 0 (já implementado).

### Onde mexe

- **`src/pages/Processes.tsx`** (única alteração):
  - Trocar a constante `PAGE_SIZE` por estado `pageSize` (`useState<20|50|100>(50)`).
  - Adicionar `Select` (shadcn) com as três opções.
  - Substituir o bloco atual de paginação (linhas ~104–115) por um componente novo `<TablePagination>` com numeração + setas duplas.
  - Resetar `page` para 0 também quando `pageSize` muda.

- **Novo componente `src/components/processes/TablePagination.tsx`** (~60 linhas), reutilizável:
  - Props: `page`, `totalPages`, `pageSize`, `totalCount`, `onPageChange`, `onPageSizeChange`, `pageSizeOptions = [20, 50, 100]`.
  - Renderiza: texto "X de Y · N processos", `Select` de tamanho, botões `«` `‹` `[1 … n]` `›` `»`.
  - Algoritmo de números: janela de 5 ao redor da página atual, com `1 …` / `… N` quando há gap > 1.

### Detalhes técnicos

- `useProcesses({ page, pageSize })` já aceita `pageSize` dinâmico — o hook usa o parâmetro na queryKey, então cache do React Query separa por tamanho automaticamente. Sem mudança no hook.
- A query atual ordena por `numero_pasta DESC` e usa `count: 'exact'`, então `totalCount` continua correto para qualquer `pageSize`.
- Componente `Pagination` do shadcn (`src/components/ui/pagination.tsx`) já existe, mas seus links são `<a>`. Vou usar `Button` direto dentro do `TablePagination` próprio para manter handlers `onClick` simples (consistente com o resto da página) — sem dependência adicional.
- Sem mudanças em RLS, hooks, tipos ou banco.

### Fora do escopo

- Aplicar o mesmo padrão a Clientes/Solicitações/Prazos (atualmente sem paginação numérica server-side completa) — pode ser próxima iteração reutilizando `TablePagination`.
- Persistir preferência de `pageSize` por usuário (localStorage / profile). Por ora, default 50 a cada visita.
