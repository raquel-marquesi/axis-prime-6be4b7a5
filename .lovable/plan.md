

## Unificar fontes: remover `font-mono` e usar Inter em todo o sistema

### Problema
O CPF/CNPJ nos cards de clientes (e números de processo, datas em outras telas) usa `font-mono`, que renderiza em uma fonte monoespaçada genérica do sistema, quebrando a consistência visual com a fonte Inter recém-adotada.

### Solução
Substituir todas as ocorrências de `font-mono` por `tabular-nums tracking-wide` — isso mantém o alinhamento numérico (dígitos com largura uniforme) usando a própria Inter, sem trocar de família tipográfica.

### Arquivos afetados (12 arquivos, ~86 ocorrências)

| Arquivo | Contexto |
|---------|----------|
| `src/components/clients/ClientsCards.tsx` | CPF/CNPJ nos cards |
| `src/components/clients/ClientsTable.tsx` | CPF/CNPJ na tabela |
| `src/components/processes/ProcessDetailsDialog.tsx` | Número do processo, CPF |
| `src/components/processes/ProcessesTable.tsx` | Números de processo/pasta |
| `src/components/processes/ProcessFormDialog.tsx` | Select de processos |
| `src/components/timesheet/TimesheetTable.tsx` | Datas e número pasta |
| `src/components/timesheet/TimesheetFormDialog.tsx` | Select de processos |
| `src/components/financeiro/PlanoContasTab.tsx` | Código de contas |
| `src/components/dashboard/SyncErrorsDialog.tsx` | Linha de erro |
| `src/components/solicitacoes/PrazosProcessuaisTab.tsx` | Números de processo |
| `src/components/ui/chart.tsx` | Valores numéricos |
| Demais arquivos com `font-mono` | Busca e substituição global |

### Regra de substituição
- `font-mono` → `tabular-nums tracking-wide` (na maioria dos casos)
- Onde `font-mono` aparece junto com `font-medium` ou `font-semibold`, manter esses modificadores

Nenhuma alteração estrutural — apenas classe CSS.

