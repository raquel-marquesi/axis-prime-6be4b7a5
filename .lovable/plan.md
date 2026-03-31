

## Vincular histórico de atividades (timesheet) aos processos no frontend

### Situação atual

O `ProcessDetailsDialog` tem 3 abas: **Informações**, **Relacionados** e **Prazos**. Não existe nenhuma aba que mostre o histórico de atividades (timesheet_entries) vinculadas ao processo. Os dados existem no banco — `timesheet_entries.process_id` referencia `processes.id` — mas nunca são exibidos no contexto do processo.

O hook `useTimesheet` já filtra por `user_id` do usuário logado. Para a aba do processo, precisamos de uma query diferente: buscar **todas** as entradas de todos os usuários para aquele `process_id`.

### Plano

**1. `src/components/processes/ProcessDetailsDialog.tsx`**
- Adicionar 4ª aba **"Atividades"** (ícone `Clock`) na TabsList (mudar grid para `grid-cols-4`)
- Dentro da aba, renderizar o novo componente `ProcessTimesheetTab`

**2. Criar `src/components/processes/ProcessTimesheetTab.tsx`**
- Recebe `processId: string` como prop
- Query direta ao Supabase: `timesheet_entries` filtrado por `process_id`, com join em `activity_types` (nome/peso) e `profiles` (via `user_id` → nome do responsável)
- Exibe tabela com colunas: **Data**, **Responsável**, **Atividade**, **Descrição**, **Qtd/Peso**
- Ordenação por `data_atividade` decrescente
- Estado vazio: "Nenhuma atividade registrada para este processo"
- Sem ações de edição/exclusão (visualização apenas, no contexto do processo)

### Resultado

Ao abrir os detalhes de qualquer processo, a aba "Atividades" mostrará todo o histórico de lançamentos de timesheet feitos por qualquer usuário naquele processo, dando visibilidade completa da produção associada à pasta.

### Arquivos

| Arquivo | Ação |
|---------|------|
| `src/components/processes/ProcessTimesheetTab.tsx` | Criar |
| `src/components/processes/ProcessDetailsDialog.tsx` | Adicionar aba "Atividades" |

