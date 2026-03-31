

## Auditoria: Configurações — Tabelas do banco vs. Frontend

### Status atual das abas

| Aba | Tabelas consultadas | Status |
|-----|---------------------|--------|
| Geral | nenhuma (local state) | Funcional (mas não persiste no banco) |
| Empresa | `company_entities`, `branches` | OK |
| Usuários | `profiles` | OK (falta exibir `user_roles`, `is_active`) |
| Permissões | `custom_roles` | Parcial — faltam 3 tabelas |
| Notificações | nenhuma (local state) | Stub — não persiste |
| Backup e Dados | nenhuma | Stub — apenas informativo |

### Tabelas de configuração SEM interface no frontend

| Tabela | Registros | Descrição | Onde deveria aparecer |
|--------|-----------|-----------|----------------------|
| `activity_types` | 65 | Tipos de atividade + peso para timesheet/premiação | Nova aba "Operacional" |
| `area_goals` | 12 | Metas mensais por área + valor extra por cálculo | Nova aba "Operacional" |
| `calculation_types` | 12 | Tipos de cálculo (Sentença, Acórdão, etc.) | Nova aba "Operacional" |
| `phase_area_mapping` | 15 | Mapeamento fase → área para distribuição automática | Nova aba "Operacional" |
| `permissions` | 54 | Permissões por módulo/ação | Aba "Permissões" |
| `role_permissions` | 308 | Vínculo papel → permissão | Aba "Permissões" |
| `user_permission_overrides` | ? | Exceções de permissão por usuário | Aba "Permissões" |
| `contract_keys` | 11 | Chaves de contrato (BRADESCO, BOTICARIO, etc.) | Aba "Empresa" ou nova aba |
| `client_aliases` | 12 | Nomes alternativos de clientes para matching | Aba "Empresa" ou "Dados" |
| `user_aliases` | 1 | Nomes alternativos de usuários para matching | Aba "Usuários" |
| `monitored_emails` | 0 | E-mails monitorados para importação automática | Aba "Notificações" ou "Integrações" |
| `economic_groups` | ? | Grupos econômicos de clientes | Aba "Empresa" |
| `bank_accounts_config` | 6 | Contas bancárias da empresa | Aba "Empresa" (já existe em Financeiro) |
| `nfse_config` | 0 | Configuração de NFSe | Aba "Empresa" ou Financeiro |

### Plano de implementação

**1. Nova aba "Operacional"** em Configurações
- CRUD para `activity_types` (nome, peso, área, ativo/inativo)
- CRUD para `area_goals` (meta mensal, valor extra por área)
- CRUD para `calculation_types` (nome, complexidade estimada)
- CRUD para `phase_area_mapping` (keyword de fase → área/setor)
- Criar componente `src/components/configuracoes/OperationalSettings.tsx`

**2. Expandir aba "Permissões"**
- Além de `custom_roles`, exibir a **matriz de permissões**: role × módulo/ação com checkboxes
- Dados vêm de `permissions`, `role_permissions`
- Permitir override por usuário (`user_permission_overrides`)
- Expandir `UserRolesSettings.tsx` ou criar `PermissionsMatrix.tsx`

**3. Expandir aba "Empresa"**
- Adicionar seção para `economic_groups` (CRUD)
- Adicionar seção para `contract_keys` (CRUD)
- Adicionar seção para `client_aliases` e `user_aliases` (tabelas de apelidos para matching de importação)

**4. Expandir aba "Usuários"**
- Exibir coluna `is_active` (hoje mostra sempre "Ativo")
- Exibir roles do usuário (via `user_roles`)
- Exibir `reports_to` (supervisor)

**5. Aba "Notificações"**
- Conectar `monitored_emails` para gerenciar caixas de entrada monitoradas
- Atualmente é stub com estado local — decisão: persistir preferências no banco ou manter como está

### Arquivos

| Arquivo | Ação |
|---------|------|
| `src/components/configuracoes/OperationalSettings.tsx` | Criar — CRUD activity_types, area_goals, calculation_types, phase_area_mapping |
| `src/components/configuracoes/PermissionsMatrix.tsx` | Criar — Matriz de permissões role × módulo |
| `src/components/configuracoes/CompanySettings.tsx` | Expandir — economic_groups, contract_keys, aliases |
| `src/components/configuracoes/UserRolesSettings.tsx` | Expandir — integrar PermissionsMatrix |
| `src/pages/Configuracoes.tsx` | Adicionar aba "Operacional" |
| `src/pages/UserManagement.tsx` | Exibir is_active, roles, reports_to |

