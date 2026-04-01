

## Tornar cards de prazos clicáveis no Dashboard

### Problema

Os cards de "Prazos Pendentes" e "Prazos Atrasados" no dashboard são estáticos — não navegam para a lista de prazos ao clicar.

### Solução

Adicionar `onClick={() => navigate('/solicitacoes')}` e `cursor-pointer` nos cards de prazos em todos os dashboards:

### Arquivos a editar

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/Dashboard.tsx` | Importar `useNavigate`; tornar o card "Prazos Pendentes" clicável com `onClick` → `/solicitacoes` e `cursor-pointer` |
| `src/components/dashboard/ManagerDashboard.tsx` | Importar `useNavigate`; tornar os 2 cards (Pendentes/Atrasados) clicáveis → `/solicitacoes` |
| `src/components/dashboard/CoordinatorDashboard.tsx` | Os 4 cards de stats (incluindo Prazos Pendentes/Atrasados) já não navegam — adicionar `onClick` → `/solicitacoes` nos cards de prazos e `cursor-pointer` |

### Comportamento

- Clique no card → navega para `/solicitacoes` (página de Prazos)
- Visual: `cursor-pointer` + `hover:shadow-md transition-shadow` para indicar interatividade

