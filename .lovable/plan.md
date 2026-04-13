

## Permitir edição de processo a partir da aba Prazos

### Problema

Na `PrazosProcessuaisTab`, o `ProcessDetailsDialog` é renderizado com `onEdit={() => {}}` (linha 176), ou seja, o botão "Editar" dentro do dialog não faz nada.

### Solução

Adicionar o `ProcessFormDialog` à `PrazosProcessuaisTab` e conectar o callback `onEdit` para abrir o formulário de edição do processo.

### Alterações em `src/components/solicitacoes/PrazosProcessuaisTab.tsx`

1. Importar `ProcessFormDialog`
2. Adicionar estado `editProcess` para controlar qual processo está sendo editado
3. No `onEdit` do `ProcessDetailsDialog`, fechar o dialog de detalhes e abrir o `ProcessFormDialog` com o processo selecionado
4. Renderizar `ProcessFormDialog` com `process={editProcess}`

### Detalhes

| Arquivo | Ação |
|---------|------|
| `src/components/solicitacoes/PrazosProcessuaisTab.tsx` | Adicionar ProcessFormDialog e conectar onEdit |

A mudança é mínima: ~5 linhas de código adicionais. O `ProcessFormDialog` já suporta receber um `process` para edição e já contém toda a lógica de atualização via `useProcesses().updateProcess`.

