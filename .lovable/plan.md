

## Consolidar página Financeiro com todos os módulos existentes

### Diagnóstico

A página `/financeiro` mostra apenas 3 componentes básicos (FinanceSummary, FinanceTable, FinanceCharts). Existem **50+ componentes financeiros** já criados no codebase que nunca foram integrados à página:

- **Contas a Pagar/Receber**, **DRE**, **Fluxo de Caixa**, **Tesouraria**
- **NF-Se**, **Boletos**, **Impostos**, **Contratos/Precificação**
- **Plano de Contas**, **Centro de Custos**, **Contas Bancárias**
- **Breakeven**, **KPIs Financeiros**, **Análise Financeira**
- **Recebíveis**, **Projeção de Receita**, **Rentabilidade**

Esses componentes estão prontos mas órfãos — alguns aparecem apenas no `FinanceDashboard` (widget do Dashboard para perfil financeiro).

### Proposta

Reorganizar `/financeiro` em abas, agrupando os módulos existentes:

| Aba | Componentes |
|-----|-------------|
| **Visão Geral** | FinanceSummary, FinancialKPICards, RecebiveisWidget, ProjecaoReceitaWidget, FinanceCharts |
| **Transações** | FinanceTable, AddTransactionDialog, ExpensesTable, AccountsTable |
| **Faturamento** | InvoicesTable, BoletosTab, NfseTab, ContratosTab, ContractPricingTable, AgendaFaturamentoWidget |
| **Relatórios** | DREReport, FluxoCaixaReport, ContasPagarReport, ContasReceberReport, CentroCustosReport, TesourariaReport |
| **Impostos** | ImpostosTab, TaxSimulator, TaxInfoCard |
| **Configurações** | PlanoContasTab, CompanyBankAccountsTab, BillingContactsTable, BankReconciliation |

### Alterações

**1. `src/pages/Financeiro.tsx`** — Reescrever com sistema de abas expandido, importando todos os componentes relevantes.

**2. `src/components/dashboard/FinanceDashboard.tsx`** — Manter como está (é o widget do Dashboard, não da página).

Nenhum componente novo precisa ser criado — todos já existem. Apenas a página que os organiza precisa ser atualizada.

