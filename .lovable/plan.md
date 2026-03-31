

## Unificar layout: todas as páginas com sidebar lateral

### Situação atual

Apenas 3 páginas usam `MainLayout` (que contém a `Sidebar`): **Dashboard**, **Clients**, **Processes**. As demais 7 páginas protegidas renderizam conteúdo solto, sem sidebar:

- Solicitacoes, Premiacao, Financeiro, Relatorios, Configuracoes, Equipes, UserManagement, ImportarPautas

### Solução

A abordagem mais limpa é mover o `MainLayout` para dentro do `ProtectedRoute`, eliminando a necessidade de cada página importar e wrappear manualmente.

### Alterações

**1. `src/components/ProtectedRoute.tsx`**
- Importar `MainLayout` e wrappear `{children}` com ele, de forma que toda rota protegida automaticamente tenha sidebar.

**2. Remover `MainLayout` das 3 páginas que já o usam:**
- `src/pages/Dashboard.tsx` — remover import e wrapper `<MainLayout>`
- `src/pages/Clients.tsx` — idem
- `src/pages/Processes.tsx` — idem

Resultado: todas as páginas protegidas terão sidebar automaticamente, sem duplicação de código.

