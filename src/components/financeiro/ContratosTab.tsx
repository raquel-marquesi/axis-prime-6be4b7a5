import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ContractPricingTable } from './ContractPricingTable';
import { ContractPricingFormDialog } from './ContractPricingFormDialog';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export function ContratosTab() {
  const [formOpen, setFormOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Contratos de Precificação</h3>
        <Button size="sm" onClick={() => setFormOpen(true)}><Plus className="h-4 w-4 mr-2" />Novo Contrato</Button>
      </div>
      <ContractPricingTable />
      <ContractPricingFormDialog open={formOpen} onOpenChange={setFormOpen} onSubmit={() => {}} />
    </div>
  );
}
