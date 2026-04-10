import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, FileText, Layers } from "lucide-react";

// Visão Geral
import FinanceSummary from "@/components/financeiro/FinanceSummary";
import { AnaliseFinanceiraTab } from "@/components/financeiro/AnaliseFinanceiraTab";
import { RecebiveisWidget } from "@/components/financeiro/RecebiveisWidget";
import { ProjecaoReceitaWidget } from "@/components/financeiro/ProjecaoReceitaWidget";
import FinanceCharts from "@/components/financeiro/FinanceCharts";
import { RentabilidadeChart } from "@/components/financeiro/RentabilidadeChart";
import { PremiacaoVsFaturamentoChart } from "@/components/financeiro/PremiacaoVsFaturamentoChart";

// Transações
import FinanceTable from "@/components/financeiro/FinanceTable";
import AddTransactionDialog from "@/components/financeiro/AddTransactionDialog";
import { ExpensesTable } from "@/components/financeiro/ExpensesTable";
import { ExpenseFormDialog } from "@/components/financeiro/ExpenseFormDialog";
import { AccountsTable } from "@/components/financeiro/AccountsTable";

// Faturamento
import { BillingPreReport } from "@/components/financeiro/BillingPreReport";
import { InvoicesTable } from "@/components/financeiro/InvoicesTable";
import { InvoiceFormDialog } from "@/components/financeiro/InvoiceFormDialog";
import { BatchInvoiceDialog } from "@/components/financeiro/BatchInvoiceDialog";
import { BoletosTab } from "@/components/financeiro/BoletosTab";
import { NfseTab } from "@/components/financeiro/NfseTab";
import { ContratosTab } from "@/components/financeiro/ContratosTab";
import { AgendaFaturamentoWidget } from "@/components/financeiro/AgendaFaturamentoWidget";

// Relatórios
import { DREReport } from "@/components/financeiro/DREReport";
import { FluxoCaixaReport } from "@/components/financeiro/FluxoCaixaReport";
import { ContasPagarReport } from "@/components/financeiro/ContasPagarReport";
import { ContasReceberReport } from "@/components/financeiro/ContasReceberReport";
import { CentroCustosReport } from "@/components/financeiro/CentroCustosReport";
import { TesourariaReport } from "@/components/financeiro/TesourariaReport";
import { FaturamentoClienteReport } from "@/components/financeiro/FaturamentoClienteReport";
import { FaturamentoProfissionalReport } from "@/components/financeiro/FaturamentoProfissionalReport";

// Impostos
import { ImpostosTab } from "@/components/financeiro/ImpostosTab";

// Configurações
import { PlanoContasTab } from "@/components/financeiro/PlanoContasTab";
import { CompanyBankAccountsTab } from "@/components/financeiro/CompanyBankAccountsTab";
import { TreasuryTab } from "@/components/financeiro/TreasuryTab";
import { BankReconciliation } from "@/components/financeiro/BankReconciliation";

const Financeiro = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);
  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);
  const [isBatchInvoiceOpen, setIsBatchInvoiceOpen] = useState(false);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Financeiro</h1>
          <p className="text-sm text-muted-foreground">Gerencie receitas, despesas, faturamento e relatórios financeiros.</p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Transação
        </Button>
      </div>

      <Tabs defaultValue="visao-geral" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="visao-geral">Visão Geral</TabsTrigger>
          <TabsTrigger value="transacoes">Transações</TabsTrigger>
          <TabsTrigger value="pre-relatorio">Pré-relatório</TabsTrigger>
          <TabsTrigger value="faturamento">Faturamento</TabsTrigger>
          <TabsTrigger value="relatorios">Relatórios</TabsTrigger>
          <TabsTrigger value="impostos">Impostos</TabsTrigger>
          <TabsTrigger value="configuracoes">Configurações</TabsTrigger>
        </TabsList>

        {/* Visão Geral */}
        <TabsContent value="visao-geral" className="space-y-6">
          <FinanceSummary />
          <AnaliseFinanceiraTab />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RecebiveisWidget />
            <ProjecaoReceitaWidget />
          </div>
          <FinanceCharts />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RentabilidadeChart />
            <PremiacaoVsFaturamentoChart />
          </div>
        </TabsContent>

        {/* Transações */}
        <TabsContent value="transacoes" className="space-y-6">
          <div className="flex justify-end gap-2">
            <Button onClick={() => setIsAddDialogOpen(true)} size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Nova Transação
            </Button>
            <Button onClick={() => setIsExpenseDialogOpen(true)} size="sm" variant="outline" className="gap-2">
              <Plus className="h-4 w-4" />
              Nova Despesa
            </Button>
          </div>
          <FinanceTable />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ExpensesTable />
            <AccountsTable />
          </div>
        </TabsContent>

        {/* Pré-relatório */}
        <TabsContent value="pre-relatorio" className="space-y-6">
          <BillingPreReport />
        </TabsContent>

        {/* Faturamento */}
        <TabsContent value="faturamento" className="space-y-6">
          <div className="flex justify-end gap-2">
            <Button onClick={() => setIsInvoiceDialogOpen(true)} size="sm" className="gap-2">
              <FileText className="h-4 w-4" />
              Nova Fatura
            </Button>
            <Button onClick={() => setIsBatchInvoiceOpen(true)} size="sm" variant="outline" className="gap-2">
              <Layers className="h-4 w-4" />
              Faturamento em Lote
            </Button>
          </div>
          <AgendaFaturamentoWidget />
          <InvoicesTable />
          <BoletosTab />
          <NfseTab />
          <ContratosTab />
        </TabsContent>

        {/* Relatórios */}
        <TabsContent value="relatorios" className="space-y-6">
          <Tabs defaultValue="dre" className="space-y-4">
            <TabsList className="flex-wrap h-auto gap-1">
              <TabsTrigger value="dre">DRE</TabsTrigger>
              <TabsTrigger value="fluxo-caixa">Fluxo de Caixa</TabsTrigger>
              <TabsTrigger value="contas-pagar">Contas a Pagar</TabsTrigger>
              <TabsTrigger value="contas-receber">Contas a Receber</TabsTrigger>
              <TabsTrigger value="centro-custos">Centro de Custos</TabsTrigger>
              <TabsTrigger value="tesouraria">Tesouraria</TabsTrigger>
              <TabsTrigger value="fat-cliente">Fat. por Cliente</TabsTrigger>
              <TabsTrigger value="fat-profissional">Fat. por Profissional</TabsTrigger>
            </TabsList>
            <TabsContent value="dre"><DREReport /></TabsContent>
            <TabsContent value="fluxo-caixa"><FluxoCaixaReport /></TabsContent>
            <TabsContent value="contas-pagar"><ContasPagarReport /></TabsContent>
            <TabsContent value="contas-receber"><ContasReceberReport /></TabsContent>
            <TabsContent value="centro-custos"><CentroCustosReport /></TabsContent>
            <TabsContent value="tesouraria"><TesourariaReport /></TabsContent>
            <TabsContent value="fat-cliente"><FaturamentoClienteReport /></TabsContent>
            <TabsContent value="fat-profissional"><FaturamentoProfissionalReport /></TabsContent>
          </Tabs>
        </TabsContent>

        {/* Impostos */}
        <TabsContent value="impostos" className="space-y-6">
          <ImpostosTab />
        </TabsContent>

        {/* Configurações */}
        <TabsContent value="configuracoes" className="space-y-6">
          <PlanoContasTab />
          <CompanyBankAccountsTab />
          <TreasuryTab />
          <BankReconciliation />
        </TabsContent>
      </Tabs>

      <AddTransactionDialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen} />
      <ExpenseFormDialog open={isExpenseDialogOpen} onOpenChange={setIsExpenseDialogOpen} />
      <InvoiceFormDialog open={isInvoiceDialogOpen} onOpenChange={setIsInvoiceDialogOpen} />
      <BatchInvoiceDialog open={isBatchInvoiceOpen} onOpenChange={setIsBatchInvoiceOpen} />
    </div>
  );
};

export default Financeiro;
