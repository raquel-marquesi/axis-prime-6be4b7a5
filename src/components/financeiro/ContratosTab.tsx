import { useState } from 'react';
import { ContractPricingTable } from './ContractPricingTable';
import { ContractPricingFormDialog } from './ContractPricingFormDialog';
import { useContractPricing, ContractPricingFormData } from '@/hooks/useContractPricing';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export function ContratosTab() {
  const [formOpen, setFormOpen] = useState(false);
  const { createPricing } = useContractPricing();

  const handleSubmit = (data: ContractPricingFormData) => {
    createPricing.mutate(data);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Contratos de Precificação</h3>
        <Button size="sm" onClick={() => setFormOpen(true)}><Plus className="h-4 w-4 mr-2" />Novo Contrato</Button>
      </div>
      <ContractPricingTable />
      <ContractPricingFormDialog open={formOpen} onOpenChange={setFormOpen} onSubmit={handleSubmit} />
    </div>
  );
}
