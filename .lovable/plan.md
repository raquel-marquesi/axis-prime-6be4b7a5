

## Unificar nomenclatura: "Solicitações" → "Prazos"

### Contexto

As tabelas `solicitacoes` e `process_deadlines` representam o mesmo conceito no sistema. O frontend já usa "Prazos" em vários lugares (sidebar, página principal), mas ainda mantém referências a "Solicitações" em textos visíveis ao usuário.

### Arquivos a modificar (apenas textos exibidos ao usuário)

Os nomes internos de variáveis, hooks, tipos e tabelas do banco **não serão alterados** — apenas os textos renderizados na interface.

| Arquivo | Alteração |
|---------|-----------|
| `src/components/dashboard/SolicitacoesPendentesWidget.tsx` | "Nenhuma solicitação pendente" → "Nenhum prazo pendente" |
| `src/components/dashboard/CoordinatorDashboard.tsx` | Botão "Solicitações" → "Prazos" |
| `src/components/dashboard/SyncStatusWidget.tsx` | "Solicitações Planilha" → "Prazos Planilha" |
| `src/components/solicitacoes/SolicitacoesTable.tsx` | "Nenhuma solicitação encontrada" → "Nenhum prazo encontrado"; "excluir esta solicitação" → "excluir este prazo" |
| `src/components/solicitacoes/SolicitacaoFormDialog.tsx` | Títulos "Nova Solicitação" → "Novo Prazo"; "Editar Solicitação" → "Editar Prazo"; descrições ajustadas |
| `src/components/solicitacoes/SolicitacaoDetailsDialog.tsx` | Nenhum texto visível usa "solicitação" diretamente (usa labels dinâmicos) — sem alteração |
| `src/components/processes/DeadlinesTab.tsx` | Badge "Solicitação" → "Prazo vinculado" |
| `src/components/solicitacoes/PrazosProcessuaisTab.tsx` | Coluna "Origem" tooltip "Solicitação" → "Prazo" |
| `src/components/configuracoes/NotificationSettings.tsx` | "Novas Solicitações" → "Novos Prazos"; descrição ajustada |
| `src/hooks/useSolicitacoes.ts` | Toasts: "Solicitação criada/atualizada/removida" → "Prazo criado/atualizado/removido" |

### O que NÃO muda

- Nomes de tabelas no banco (`solicitacoes`)
- Nomes de hooks, tipos e variáveis (`useSolicitacoes`, `Solicitacao`, etc.)
- Rotas (`/solicitacoes`)
- Nomes de arquivos

### Resultado

Toda a interface exibirá "Prazos" de forma consistente, eliminando a confusão entre "solicitações" e "prazos".

