import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TaxSimulator } from './TaxSimulator';
import { TaxRuleForm } from './TaxRuleForm';
import { TaxInfoCard } from './TaxInfoCard';

export function ImpostosTab() {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="simulador" className="space-y-4">
        <TabsList>
          <TabsTrigger value="simulador">Simulador</TabsTrigger>
          <TabsTrigger value="regras">Regras Fiscais</TabsTrigger>
          <TabsTrigger value="info">Informações</TabsTrigger>
        </TabsList>

        <TabsContent value="simulador">
          <TaxSimulator />
        </TabsContent>

        <TabsContent value="regras">
          <TaxRuleForm />
        </TabsContent>

        <TabsContent value="info">
          <TaxInfoCard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
