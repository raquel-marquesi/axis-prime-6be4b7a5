## Configuração Personalizada do Dashboard

### Conceito

Cada usuário poderá escolher quais widgets aparecem no seu dashboard principal, com as opções filtradas de acordo com seus perfis de acesso. As preferências são salvas na tabela `profiles` (novo campo JSONB `dashboard_config`) para persistência sem necessidade de nova tabela. Perfil de sócio tem visualização de todos os campos. 

### Widgets disponíveis por perfil


| Widget                   | Todos  | Coordenador+ | Gerente/Admin | Financeiro |
| ------------------------ | ------ | ------------ | ------------- | ---------- |
| Calendário Interno       | ✓      | ✓            | ✓             | ✓          |
| Bônus/Premiação          | ✓      | ✓            | ✓             | &nbsp;     |
| Prazos Pendentes         | ✓      | ✓            | ✓             | &nbsp;     |
| Prazos Atrasados         | ✓      | ✓            | ✓             | &nbsp;     |
| Produção                 | &nbsp; | ✓            | ✓             | &nbsp;     |
| Meta da Equipe           | &nbsp; | ✓            | ✓             | &nbsp;     |
| Prazos por Membro        | &nbsp; | ✓            | &nbsp;        | &nbsp;     |
| Contratos a Vencer       | &nbsp; | &nbsp;       | ✓             | ✓          |
| Google Calendar          | &nbsp; | ✓            | ✓             | &nbsp;     |
| Recebíveis               | &nbsp; | &nbsp;       | &nbsp;        | ✓          |
| Agenda Faturamento       | &nbsp; | &nbsp;       | &nbsp;        | ✓          |
| Rentabilidade            | &nbsp; | &nbsp;       | &nbsp;        | ✓          |
| Premiação vs Faturamento | &nbsp; | &nbsp;       | &nbsp;        | ✓          |
| Projeção Receita         | &nbsp; | &nbsp;       | &nbsp;        | ✓          |
| Clientes Ativos          | &nbsp; | &nbsp;       | &nbsp;        | ✓          |


### Implementação

#### 1. Migração SQL

- Adicionar coluna `dashboard_config jsonb DEFAULT null` na tabela `profiles`
- Estrutura: `{ "widgets": ["calendar", "bonus", "deadlines_pending", ...], "layout": "default" }`

#### 2. Novo componente `DashboardSettings.tsx` em `src/components/configuracoes/`

- Lista de checkboxes com todos os widgets disponíveis para o perfil do usuário
- Usa `useAuth()` para filtrar widgets por role
- Salva no campo `dashboard_config` do profile via Supabase update
- Botão "Restaurar Padrão" para voltar à configuração original do role
- Preview visual com a ordem dos widgets (drag opcional — v1 sem drag, apenas checkboxes)

#### 3. Nova aba "Dashboard" na página Configurações

- Ícone `LayoutDashboard`
- Renderiza `<DashboardSettings />`

#### 4. Modificar `src/pages/Dashboard.tsx`

- Ler `profile.dashboard_config` para obter a lista de widgets habilitados
- Se `null`, usar o default do role (comportamento atual)
- `renderRoleBasedDashboard()` passa a iterar sobre a lista de widgets configurados, renderizando cada um condicionalmente
- Cada widget é um componente independente mapeado por um ID string

#### 5. Registro de widgets (`src/lib/dashboardWidgets.ts`)

- Objeto de definição: `{ id, label, component, requiredRoles[], defaultForRoles[] }`
- Centraliza o catálogo de widgets disponíveis
- Usado tanto pelo `DashboardSettings` (para exibir opções) quanto pelo `Dashboard` (para renderizar)

### Arquivos


| Arquivo                                              | Ação                                                                  |
| ---------------------------------------------------- | --------------------------------------------------------------------- |
| Migration SQL                                        | `ALTER TABLE profiles ADD COLUMN dashboard_config jsonb DEFAULT null` |
| `src/lib/dashboardWidgets.ts`                        | Criar — registro de widgets                                           |
| `src/components/configuracoes/DashboardSettings.tsx` | Criar — UI de configuração                                            |
| `src/pages/Configuracoes.tsx`                        | Adicionar aba "Dashboard"                                             |
| `src/pages/Dashboard.tsx`                            | Ler config e renderizar widgets dinamicamente                         |


### Resultado

- Cada usuário personaliza seu dashboard com os widgets que mais usa
- Widgets filtrados por role — ninguém vê opções que não pode acessar
- Sem config salva = comportamento atual (retrocompatível)