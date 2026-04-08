

## Substituir Select de Grupo Econômico por Combobox com busca por digitação

### Mudança

O filtro de Grupo Econômico usa um `Select` simples (linhas 152-164). Substituir por um **Combobox** (Popover + Command + CommandInput) idêntico ao padrão já usado no seletor de clientes logo abaixo, permitindo digitar parte do nome do grupo e refinar as opções em tempo real.

### Implementação em `src/components/financeiro/BillingPreviewTab.tsx`

1. Adicionar estado `groupComboboxOpen` (boolean)
2. Substituir o bloco `Select` de Grupo Econômico (linhas 152-164) por um `Popover` + `Command` com:
   - `CommandInput` com placeholder "Buscar grupo..."
   - `CommandItem` para "Todos" (limpa seleção)
   - `CommandItem` para cada grupo, com `value={g.nome}` para busca textual
   - Check icon ao lado do grupo selecionado
3. Label do botão: nome do grupo selecionado ou "Todos"

Mesma largura e altura (`min-w-[200px]`, `h-9`) para manter o layout.

### Arquivos

| Arquivo | Ação |
|---------|------|
| `src/components/financeiro/BillingPreviewTab.tsx` | Substituir Select por Combobox no filtro de Grupo Econômico |

