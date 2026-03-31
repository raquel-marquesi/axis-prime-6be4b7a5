

## Unificar tela: remover aba Solicitações, manter apenas Prazos Processuais

### O que muda

A página `/solicitacoes` atualmente tem duas abas (Solicitações e Prazos Processuais). O componente `PrazosProcessuaisTab` passará a ser o conteúdo principal da página, sem abas. A aba de solicitações genéricas (tabela `solicitacoes`) será removida da interface.

### Alterações

**1. `src/pages/Solicitacoes.tsx`**
- Remover todo o sistema de tabs, cards de contagem de solicitações, e os dialogs de formulário/detalhes de solicitações.
- Renderizar diretamente o `PrazosProcessuaisTab` como conteúdo principal.
- Atualizar o título da página para "Prazos Processuais".
- Remover o botão "Nova Solicitação" (a criação de prazos já é feita via processos).
- Remover imports de `useSolicitacoes`, `SolicitacoesTable`, `SolicitacaoFormDialog`, `SolicitacaoDetailsDialog`.

**2. `src/components/layout/Sidebar.tsx`**
- Renomear o item de menu de "Prazos" para "Prazos" (já está correto, sem alteração necessária).

### Arquivos não removidos
Os componentes `SolicitacoesTable`, `SolicitacaoFormDialog`, `SolicitacaoDetailsDialog` e o hook `useSolicitacoes` serão mantidos no codebase caso sejam referenciados em outros lugares (ex: dashboard widgets), mas não serão mais acessíveis pela navegação principal.

