import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ContractPricing { id: string; cliente_nome: string; contrato: string; tipo_calculo: string; valor: number | null; moeda: string | null; percentual: number | null; tipo_valor: string | null; monitoramento: string | null; proc_andamento: number | null; proc_encerrado: number | null; cod_cliente: number | null; cod_contrato: number | null; client_id: string | null; is_active: boolean | null; created_at: string | null; updated_at: string | null; }
export type ContractPricingFormData = Omit<ContractPricing, 'id' | 'created_at' | 'updated_at'>;

export function useContractPricing(options?: { clientId?: string; clienteNome?: string }) {
  const queryClient = useQueryClient();

  const { data: pricings = [], isLoading } = useQuery({
    queryKey: ['contract_pricing', options?.clientId, options?.clienteNome],
    queryFn: async () => {
      let query = supabase.from('contract_pricing').select('*').order('cliente_nome', { ascending: true });
      if (options?.clientId) query = query.eq('client_id', options.clientId);
      if (options?.clienteNome) query = query.ilike('cliente_nome', `%${options.clienteNome}%`);
      const { data, error } = await query;
      if (error) throw error;
      return data as ContractPricing[];
    },
  });

  const createPricing = useMutation({
    mutationFn: async (formData: ContractPricingFormData) => { const { error } = await supabase.from('contract_pricing').insert(formData); if (error) throw error; },
    onSuccess: () => { toast.success('Valor contratual criado com sucesso'); queryClient.invalidateQueries({ queryKey: ['contract_pricing'] }); },
    onError: (err: any) => toast.error('Erro ao criar: ' + err.message),
  });

  const updatePricing = useMutation({
    mutationFn: async ({ id, ...formData }: Partial<ContractPricing> & { id: string }) => { const { error } = await supabase.from('contract_pricing').update(formData).eq('id', id); if (error) throw error; },
    onSuccess: () => { toast.success('Valor contratual atualizado'); queryClient.invalidateQueries({ queryKey: ['contract_pricing'] }); },
    onError: (err: any) => toast.error('Erro ao atualizar: ' + err.message),
  });

  const deletePricing = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('contract_pricing').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => { toast.success('Valor contratual removido'); queryClient.invalidateQueries({ queryKey: ['contract_pricing'] }); },
    onError: (err: any) => toast.error('Erro ao remover: ' + err.message),
  });

  return { pricings, isLoading, createPricing, updatePricing, deletePricing };
}
