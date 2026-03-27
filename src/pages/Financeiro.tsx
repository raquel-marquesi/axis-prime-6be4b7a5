import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, Download, Filter } from "lucide-react";
import FinanceSummary from "@/components/financeiro/FinanceSummary";
import FinanceTable from "@/components/financeiro/FinanceTable";
import FinanceCharts from "@/components/financeiro/FinanceCharts";
import AddTransactionDialog from "@/components/financeiro/AddTransactionDialog";

const Financeiro = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Financeiro</h1>
          <p className="text-muted-foreground">Gerencie suas receitas, despesas e fluxo de caixa.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Exportar
          </Button>
          <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Nova Transação
          </Button>
        </div>
      </div>

      <FinanceSummary />

      <Tabs defaultValue="lista" className="space-y-4">
        <TabsList>
          <TabsTrigger value="lista">Lista de Transações</TabsTrigger>
          <TabsTrigger value="graficos">Análise Gráfica</TabsTrigger>
        </TabsList>

        <TabsContent value="lista" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle>Transações Recentes</CardTitle>
              <Button variant="ghost" size="sm" className="gap-2">
                <Filter className="h-4 w-4" />
                Filtrar
              </Button>
            </CardHeader>
            <CardContent>
              <FinanceTable />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="graficos">
          <FinanceCharts />
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
