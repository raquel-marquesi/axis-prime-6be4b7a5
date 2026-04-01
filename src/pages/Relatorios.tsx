import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, Users, FileText, DollarSign, TrendingUp, Clock } from 'lucide-react';
import { DREReport } from '@/components/financeiro/DREReport';
import { FaturamentoClienteReport } from '@/components/financeiro/FaturamentoClienteReport';
import { FaturamentoProfissionalReport } from '@/components/financeiro/FaturamentoProfissionalReport';
import { CentroCustosReport } from '@/components/financeiro/CentroCustosReport';
import CarteiraReport from '@/components/relatorios/CarteiraReport';
import { PrazosReport } from '@/components/relatorios/PrazosReport';

export default function Relatorios() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Relatórios</h1>
        <p className="text-muted-foreground">Visualize relatórios gerenciais e financeiros.</p>
      </div>

      <Tabs defaultValue="dre" className="space-y-4">
        <TabsList className="bg-background border p-1 h-auto flex-wrap justify-start gap-2">
          <TabsTrigger value="dre" className="flex items-center gap-2"><BarChart3 className="w-4 h-4" />DRE</TabsTrigger>
          <TabsTrigger value="faturamento-cliente" className="flex items-center gap-2"><Users className="w-4 h-4" />Fat. por Cliente</TabsTrigger>
          <TabsTrigger value="faturamento-profissional" className="flex items-center gap-2"><TrendingUp className="w-4 h-4" />Fat. por Profissional</TabsTrigger>
          <TabsTrigger value="centro-custos" className="flex items-center gap-2"><DollarSign className="w-4 h-4" />Centro de Custos</TabsTrigger>
          <TabsTrigger value="carteira" className="flex items-center gap-2"><FileText className="w-4 h-4" />Carteira</TabsTrigger>
        </TabsList>

        <TabsContent value="dre"><DREReport /></TabsContent>
        <TabsContent value="faturamento-cliente"><FaturamentoClienteReport /></TabsContent>
        <TabsContent value="faturamento-profissional"><FaturamentoProfissionalReport /></TabsContent>
        <TabsContent value="centro-custos"><CentroCustosReport /></TabsContent>
        <TabsContent value="carteira"><CarteiraReport /></TabsContent>
      </Tabs>
    </div>
  );
}
