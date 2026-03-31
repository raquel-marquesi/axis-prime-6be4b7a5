

## Corrigir página Equipes — tabela `equipes` não existe

### Problema

A página `/equipes` tenta consultar uma tabela `equipes` que nunca foi criada no banco de dados. O `as any` no código mascara o erro de tipo, e a query retorna vazio silenciosamente. Por isso a tela aparece em branco.

### Dados reais disponíveis

O sistema já tem dados de equipes funcionando via:
- **`team_clients`** — 58 registros vinculando 5 team leads a clientes
- **`profiles`** — hierarquia via `reports_to`, com `full_name` e `sigla`
- **`useTeamClients`** hook — já implementado com CRUD completo

### Solução

Reescrever `src/pages/Equipes.tsx` para exibir as equipes reais baseadas nos **team leads** (líderes com clientes vinculados em `team_clients`), em vez de depender de uma tabela inexistente.

### Alterações

**`src/pages/Equipes.tsx`** — Reescrever:
- Importar `useTeamClients` e `useProfiles` (hooks existentes)
- Buscar team leads distintos a partir de `team_clients`
- Para cada team lead, exibir um Card com:
  - Nome do líder (via profiles)
  - Quantidade de clientes vinculados
  - Lista resumida dos clientes
  - Botões para gerenciar vínculos (adicionar/remover clientes)
- Remover toda referência à tabela `equipes`
- Manter o dialog de vincular clientes a um líder (substituindo "Nova Equipe" por "Vincular Cliente a Líder")

### Resultado

A página passa a mostrar as 5 equipes reais com seus 58 vínculos de clientes, em vez de uma tela vazia.

