import { PrazosProcessuaisTab } from '@/components/solicitacoes/PrazosProcessuaisTab';
import { PrazosReport } from '@/components/relatorios/PrazosReport';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, BarChart3 } from 'lucide-react';

const Solicitacoes = () => {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Prazos Processuais</h1>
        <p className="text-sm text-muted-foreground">Gerencie os prazos processuais vinculados aos processos do sistema.</p>
      </div>
      <Tabs defaultValue="prazos" className="w-full">
        <TabsList>
          <TabsTrigger value="prazos" className="gap-2">
            <Clock className="h-4 w-4" />
            Prazos
          </TabsTrigger>
          <TabsTrigger value="relatorios" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Relatórios
          </TabsTrigger>
        </TabsList>
        <TabsContent value="prazos">
          <PrazosProcessuaisTab />
        </TabsContent>
        <TabsContent value="relatorios">
          <PrazosReport />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Solicitacoes;
