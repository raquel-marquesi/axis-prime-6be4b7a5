

## Problema: Página de Gerenciamento de Usuários inacessível

A página de gerenciamento de usuários existe em `/usuarios` (com `UserManagement.tsx`), mas:
1. **Não aparece no menu lateral** — o Sidebar não tem link para `/usuarios`
2. **Não está nas Configurações** — a aba "Permissões" em `/configuracoes` mostra apenas papéis customizados (`custom_roles`), não a lista de usuários

Os usuários cadastrados estão no banco (tabela `profiles`), mas não há caminho visível para acessá-los.

### Solução

Adicionar uma aba **"Usuários"** na página de Configurações que exiba a lista completa de usuários do sistema, aproveitando o componente `UserManagement` já existente.

### Alterações

**1. `src/pages/Configuracoes.tsx`**
- Adicionar aba "Usuários" (com ícone `Users`) entre "Empresa" e "Permissões"
- Renderizar o conteúdo de gerenciamento de usuários (tabela de perfis, botão de convite, edição e exclusão) diretamente nessa aba, reutilizando a lógica do `UserManagement.tsx`

**2. `src/components/layout/Sidebar.tsx`**
- Opcionalmente, adicionar link direto para `/usuarios` no menu lateral (abaixo de Equipes), visível para admin/gerente

### Resultado
O usuário poderá ver e gerenciar todos os usuários cadastrados diretamente pela aba "Usuários" em Configurações, sem precisar conhecer a rota `/usuarios`.

