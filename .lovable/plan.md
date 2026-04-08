

## Diagnóstico: Dados dos Cards do Dashboard

### Problemas Encontrados

| Card | Status | Problema |
|------|--------|----------|
| **Prazos Pendentes** | ⚠️ Parcial | O card principal usa query filtrada por `assigned_to = userId` (só prazos do próprio usuário). O fallback `stats.pendingDeadlines` conta **todos** os prazos pendentes (131), sem filtro de `assigned_to`. Inconsistência de escopo. |
| **Prazos Atrasados** | ⚠️ Incorreto | `useDashboardStats` conta **todos** os 326 prazos atrasados do sistema, sem filtro por `assigned_to`. Para usuários comuns, deveria mostrar apenas os seus. |
| **Clientes Ativos** | ✅ OK | Contagem correta (212 clientes ativos). |
| **Contratos a Vencer** | ❌ Sempre 0 | `useDashboardStats` **não calcula** `contractsExpiring30/60/90`. O campo não existe no objeto `stats`. O card sempre mostra 0. |
| **Prazos por Membro** | ❌ Nunca exibe | `useDashboardStats` **não calcula** `deadlinesByUser`. O widget verifica `stats?.deadlinesByUser` que é sempre `undefined`, então o card nunca renderiza. |

### Correções

#### 1. `useDashboardStats.ts` — Adicionar dados faltantes e filtrar por contexto

- **Contratos a vencer**: Adicionar 3 queries em `clients` filtrando `contrato_data_vencimento` nos intervalos de 30, 60 e 90 dias
- **Prazos por membro** (para coordenadores+): Query agrupada em `process_deadlines` com join em `profiles` para obter `full_name`, contando pendentes e atrasados por `assigned_to`
- **Prazos atrasados**: Para usuários não-coordenadores, filtrar por `assigned_to = userId`. Para coordenadores+, manter contagem global ou da equipe.
- **Prazos pendentes**: Alinhar o escopo — o card diz "Próximos 7 dias", então `useDashboardStats.pendingDeadlines` deveria usar a mesma janela de 7 dias (atualmente conta todos os futuros)

#### 2. `Dashboard.tsx` — Remover query duplicada

- A query inline `pendingDeadlinesCount` (linhas 52-67) duplica parcialmente o que `useDashboardStats` deveria fazer. Mover essa lógica para dentro do hook e remover a query avulsa.

### Arquivos a Modificar

| Arquivo | Ação |
|---------|------|
| `src/hooks/useDashboardStats.ts` | Adicionar `contractsExpiring30/60/90`, `deadlinesByUser[]`, filtro por role nos prazos, janela de 7 dias |
| `src/pages/Dashboard.tsx` | Remover query duplicada `pendingDeadlinesCount`, usar apenas `stats` |

### Resultado

- Todos os cards exibem dados reais e corretos
- "Contratos a Vencer" mostra contagem real (atualmente 0 porque nenhum contrato vence nos próximos 90 dias, mas o cálculo passará a existir)
- "Prazos por Membro" renderiza a lista de membros da equipe com suas contagens
- Prazos filtrados por escopo do usuário (próprio vs equipe vs global)

