

## Busca refinada de cliente + filtros de Filial e Grupo Econômico

### Mudanças

**Arquivo: `src/hooks/useClientsSafe.ts`**
- Adicionar `economic_group_id` ao tipo `ClientSafe` (o campo já existe na view, só falta no tipo TS)

**Arquivo: `src/components/financeiro/BillingPreviewTab.tsx`**

1. Substituir o `Select` de cliente por um **Combobox** (Popover + Command) com busca por digitação — filtra por `nome`, `razao_social` e `nome_fantasia`
2. Adicionar dois filtros opcionais antes do combobox:
   - **Grupo Econômico** — Select com os grupos de `useEconomicGroups`, valor vazio = "Todos"
   - **Filial** — Select com as filiais ativas de `useBranches`, valor vazio = "Todas"
3. Buscar `client_branches` (query simples) para montar mapa `clientId → branchIds[]`
4. Filtrar a lista de clientes no combobox:
   - Se grupo selecionado → só clientes com `economic_group_id` igual
   - Se filial selecionada → só clientes presentes no mapa de `client_branches` para aquela filial
   - Texto digitado → match parcial em nome/razao_social/nome_fantasia
5. Exibir no combobox: `razao_social || nome`, com badge do grupo econômico quando existir

### Layout dos filtros

```text
[Grupo Econômico ▼]  [Filial ▼]  [🔍 Buscar cliente...]  [Mês ▼]  [Gerar]
```

Selecionar filial mostra apenas os clientes daquela filial. Selecionar grupo econômico mostra todos os clientes do grupo. Os filtros são cumulativos.

### Dados existentes

- `clients_safe` já possui `economic_group_id` (133 clientes com vínculo de filial, 3 filiais)
- Hooks `useBranches` e `useEconomicGroups` já existem
- Componentes `Command`/`Popover` já existem no projeto

### Arquivos

| Arquivo | Ação |
|---------|------|
| `src/hooks/useClientsSafe.ts` | Adicionar `economic_group_id` ao tipo |
| `src/components/financeiro/BillingPreviewTab.tsx` | Combobox + filtros de filial e grupo |

