

## Revisão do Faturamento: Problemas Encontrados

### Diagnóstico

| # | Problema | Severidade | Causa |
|---|----------|-----------|-------|
| 1 | **Tabelas financeiras vazias** (0 invoices, 0 accounts, 0 billing_contacts) | Alta | Dados ainda nao foram cadastrados, mas o fluxo de criacao funciona |
| 2 | **Policies de invoices usam role `public` em vez de `authenticated`** | Alta | INSERT/UPDATE/SELECT/DELETE em `invoices` permitem acesso anonimo |
| 3 | **Policy de DELETE em billing_contacts usa role `public`** | Alta | Anonimos poderiam deletar contatos |
| 4 | **Policy de DELETE em clients usa role `public`** | Alta | Anonimos poderiam deletar clientes |
| 5 | **`useClients` consulta tabela `clients` diretamente** | Media | Usuarios sem role finance/admin/gerente nao veem clientes no formulario de fatura (a RLS bloqueia). O `InvoiceFormDialog` depende disso para listar clientes |
| 6 | **Console warning: DialogFooter ref** | Baixa | `DialogFooter` dentro de `<form>` no `InvoiceFormDialog` gera warning de ref |
| 7 | **AgendaFaturamentoWidget consulta `clients` diretamente** | Media | Agenda de faturamento invisivel para coordenadores/lideres pois a RLS de `clients` bloqueia |
| 8 | **Faturamento em Lote cria invoices em loop sequencial** | Baixa | Sem tratamento de erro parcial; se uma falha, as anteriores ja foram criadas |

### Plano de Correção

#### 1. Migration: corrigir policies com role `public`

Trocar todas as policies de `invoices`, `billing_contacts` (DELETE) e `clients` (DELETE) que usam `public` para `authenticated`.

```sql
-- invoices: SELECT, INSERT, UPDATE, DELETE -> authenticated
-- billing_contacts: DELETE -> authenticated  
-- clients: DELETE -> authenticated
```

#### 2. Migration: permitir coordenadores verem invoices

Adicionar `is_coordinator_or_above` na policy SELECT de invoices para que coordenadores possam acompanhar o faturamento dos seus clientes.

#### 3. Ajustar `InvoiceFormDialog` para usar `clients_safe`

O formulário de nova fatura precisa listar clientes para vinculação. Como coordenadores nao tem acesso a `clients` (restrito a finance/admin/gerente), trocar para `clients_safe` no dropdown de seleção.

- Criar um hook leve `useClientsSafe()` ou ajustar o `InvoiceFormDialog` para consultar `clients_safe` diretamente
- Manter `useClients()` original para quem tem acesso completo

#### 4. Ajustar `AgendaFaturamentoWidget`

Trocar a query de `clients` para `clients_safe` na agenda de faturamento, pois ela so precisa de `nome`, `razao_social`, `dia_emissao_nf` e `dia_vencimento` -- todos expostos na view safe.

#### 5. Corrigir warning de ref no InvoiceFormDialog

Mover o `DialogFooter` para fora do componente `Form` ou envolver com `React.forwardRef`.

### Arquivos afetados

| Arquivo | Ação |
|---------|------|
| Migration SQL | Corrigir 6 policies com role `public` -> `authenticated`; adicionar coordenador ao SELECT de invoices |
| `src/components/financeiro/InvoiceFormDialog.tsx` | Usar `clients_safe`; corrigir ref warning |
| `src/components/financeiro/AgendaFaturamentoWidget.tsx` | Usar `clients_safe` |
| `src/components/financeiro/BatchInvoiceDialog.tsx` | Sem alteracao (nao depende de clients) |

### Resultado

- Sem acesso anonimo a nenhuma tabela financeira
- Coordenadores conseguem ver faturas e clientes no formulario
- Agenda de faturamento visivel para todos os roles operacionais
- Warning de console eliminado

