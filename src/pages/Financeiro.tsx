import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

// Visão Geral
import FinanceSummary from "@/components/financeiro/FinanceSummary";
import { AnaliseFinanceiraTab } from "@/components/financeiro/AnaliseFinanceiraTab";
import { RecebiveisWidget } from "@/components/financeiro/RecebiveisWidget";
import { ProjecaoReceitaWidget } from "@/components/financeiro/ProjecaoReceitaWidget";
import FinanceCharts from "@/components/financeiro/FinanceCharts";

// Transações
import FinanceTable from "@/components/financeiro/FinanceTable";
import AddTransactionDialog from "@/components/financeiro/AddTransactionDialog";
import { ExpensesTable } from "@/components/financeiro/ExpensesTable";
import { AccountsTable } from "@/components/financeiro/AccountsTable";

// Faturamento
import { InvoicesTable } from "@/components/financeiro/InvoicesTable";
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

// Impostos
import { ImpostosTab } from "@/components/financeiro/ImpostosTab";

// Configurações
import { PlanoContasTab } from "@/components/financeiro/PlanoContasTab";
import { CompanyBankAccountsTab } from "@/components/financeiro/CompanyBankAccountsTab";
import { TreasuryTab } from "@/components/financeiro/TreasuryTab";
import { BankReconciliation } from "@/components/financeiro/BankReconciliation";

const Financeiro = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

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
          <TabsTrigger value="faturamento">Faturamento</TabsTrigger>
          <TabsTrigger value="relatorios">Relatórios</TabsTrigger>
          <TabsTrigger value="impostos">Impostos</TabsTrigger>
          <TabsTrigger value="configuracoes">Configurações</TabsTrigger>
        </TabsList>

        <TabsContent value="visao-geral" className="space-y-6">
          <FinanceSummary />
          <AnaliseFinanceiraTab />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RecebiveisWidget />
            <ProjecaoReceitaWidget />
          </div>
          <FinanceCharts />
        </TabsContent>

        <TabsContent value="transacoes" className="space-y-6">
          <FinanceTable />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ExpensesTable />
            <AccountsTable />
          </div>
        </TabsContent>

        <TabsContent value="faturamento" className="space-y-6">
          <AgendaFaturamentoWidget />
          <InvoicesTable />
          <BoletosTab />
          <NfseTab />
          <ContratosTab />
        </TabsContent>

        <TabsContent value="relatorios" className="space-y-6">
          <Tabs defaultValue="dre" className="space-y-4">
            <TabsList>
              <TabsTrigger value="dre">DRE</TabsTrigger>
              <TabsTrigger value="fluxo-caixa">Fluxo de Caixa</TabsTrigger>
              <TabsTrigger value="contas-pagar">Contas a Pagar</TabsTrigger>
              <TabsTrigger value="contas-receber">Contas a Receber</TabsTrigger>
              <TabsTrigger value="centro-custos">Centro de Custos</TabsTrigger>
              <TabsTrigger value="tesouraria">Tesouraria</TabsTrigger>
            </TabsList>
            <TabsContent value="dre"><DREReport /></TabsContent>
            <TabsContent value="fluxo-caixa"><FluxoCaixaReport /></TabsContent>
            <TabsContent value="contas-pagar"><ContasPagarReport /></TabsContent>
            <TabsContent value="contas-receber"><ContasReceberReport /></TabsContent>
            <TabsContent value="centro-custos"><CentroCustosReport /></TabsContent>
            <TabsContent value="tesouraria"><TesourariaReport /></TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="impostos" className="space-y-6">
          <ImpostosTab />
        </TabsContent>

        <TabsContent value="configuracoes" className="space-y-6">
          <PlanoContasTab />
          <CompanyBankAccountsTab />
          <BillingContactsTable />
          <BankReconciliation />
        </TabsContent>
      </Tabs>

      <AddTransactionDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
      />
    </div>
  );
};

export default Financeiro;
