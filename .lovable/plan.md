
Objetivo: restaurar a rota `/financeiro` conforme a regra histórica já aprovada no projeto: ela deve ser o hub central do módulo financeiro, separada do `FinanceDashboard` da home.

Diagnóstico recuperado do histórico + código atual:
- A decisão aprovada anteriormente foi: manter o Financeiro em 6 abas fixas — Visão Geral, Transações, Faturamento, Relatórios, Impostos e Configurações.
- `src/pages/Financeiro.tsx` ainda tem essas 6 abas, mas parte da centralização se perdeu:
  - `RentabilidadeChart` e `PremiacaoVsFaturamentoChart` estão implementados, porém presos ao `src/components/dashboard/FinanceDashboard.tsx`;
  - `FaturamentoClienteReport` e `FaturamentoProfissionalReport` existem e funcionam, mas hoje só aparecem em `/relatorios`, não no painel financeiro;
  - `InvoiceFormDialog`, `ExpenseFormDialog` e `BatchInvoiceDialog` existem no módulo, mas estão órfãos ou sem ponto de entrada claro na página Financeiro;
  - o `FinanceDashboard` continua correto como widget resumido do Dashboard e não deve substituir `/financeiro`.

Plano de restauração

1. Restaurar a composição da página Financeiro em `src/pages/Financeiro.tsx`
- Preservar as 6 abas aprovadas.
- Reorganizar apenas a composição/navegação, sem reescrever regras de negócio já existentes.

2. Fortalecer a aba Visão Geral
- Manter:
  - `FinanceSummary`
  - `AnaliseFinanceiraTab`
  - `RecebiveisWidget`
  - `ProjecaoReceitaWidget`
  - `FinanceCharts`
- Reintegrar:
  - `RentabilidadeChart`
  - `PremiacaoVsFaturamentoChart`
- Regra: esses componentes podem continuar também no Dashboard, mas `/financeiro` volta a concentrar a visão analítica completa.

3. Restaurar entradas operacionais da aba Transações
- Manter:
  - `FinanceTable`
  - `ExpensesTable`
  - `AccountsTable`
- Recolocar gatilhos visíveis para:
  - `AddTransactionDialog`
  - `ExpenseFormDialog`
- Se necessário, ajustar cabeçalhos/ações dos blocos para que o usuário consiga lançar movimentações e despesas sem depender de caminhos indiretos.

4. Restaurar a aba Faturamento como módulo operacional completo
- Manter:
  - `AgendaFaturamentoWidget`
  - `InvoicesTable`
  - `BoletosTab`
  - `NfseTab`
  - `ContratosTab`
- Recolocar acessos explícitos a:
  - `InvoiceFormDialog`
  - `BatchInvoiceDialog`
- Regra: criação manual e criação em lote de faturamento não podem ficar escondidas no codebase.

5. Expandir a aba Relatórios dentro do Financeiro
- Manter as sub-abas já presentes:
  - `DREReport`
  - `FluxoCaixaReport`
  - `ContasPagarReport`
  - `ContasReceberReport`
  - `CentroCustosReport`
  - `TesourariaReport`
- Adicionar as sub-abas já implementadas:
  - `FaturamentoClienteReport`
  - `FaturamentoProfissionalReport`
- Regra: esses relatórios serão reutilizados, não movidos; continuam podendo existir também em `/relatorios`.

6. Preservar Impostos e Configurações
- Manter:
  - `ImpostosTab`
  - `PlanoContasTab`
  - `CompanyBankAccountsTab`
  - `TreasuryTab`
  - `BankReconciliation`
- Apenas validar a ordem visual para seguir a lógica operacional aprovada.

Arquivos principais
- `src/pages/Financeiro.tsx` — restauração da arquitetura e reintegração dos módulos
- Ajustes pontuais, se necessários, em:
  - `src/components/financeiro/FinanceTable.tsx`
  - `src/components/financeiro/ExpensesTable.tsx`
  - `src/components/financeiro/InvoicesTable.tsx`
para encaixar botões de ação e evitar módulos órfãos

Resultado esperado
- `/financeiro` volta a refletir as regras já estabelecidas no histórico.
- Nenhum componente financeiro importante fica sem acesso pela interface.
- O Dashboard financeiro continua como visão resumida.
- O painel financeiro volta a ser a central operacional e analítica do módulo.

Detalhes técnicos
```text
/financeiro
├─ Visão Geral
│  ├─ FinanceSummary
│  ├─ AnaliseFinanceiraTab
│  ├─ RecebiveisWidget
│  ├─ ProjecaoReceitaWidget
│  ├─ FinanceCharts
│  ├─ RentabilidadeChart
│  └─ PremiacaoVsFaturamentoChart
├─ Transações
│  ├─ FinanceTable
│  ├─ ExpensesTable
│  ├─ AccountsTable
│  └─ ações: AddTransactionDialog / ExpenseFormDialog
├─ Faturamento
│  ├─ AgendaFaturamentoWidget
│  ├─ InvoicesTable
│  ├─ ações: InvoiceFormDialog / BatchInvoiceDialog
│  ├─ BoletosTab
│  ├─ NfseTab
│  └─ ContratosTab
├─ Relatórios
│  ├─ DREReport
│  ├─ FluxoCaixaReport
│  ├─ ContasPagarReport
│  ├─ ContasReceberReport
│  ├─ CentroCustosReport
│  ├─ TesourariaReport
│  ├─ FaturamentoClienteReport
│  └─ FaturamentoProfissionalReport
├─ Impostos
└─ Configurações
   ├─ PlanoContasTab
   ├─ CompanyBankAccountsTab
   ├─ TreasuryTab
   └─ BankReconciliation
```

Critério de aceite
- a estrutura de 6 abas permanece;
- os módulos implementados no histórico voltam a aparecer em `/financeiro`;
- os diálogos financeiros deixam de ficar órfãos;
- `/financeiro` e `FinanceDashboard` continuam com papéis distintos e coerentes.
