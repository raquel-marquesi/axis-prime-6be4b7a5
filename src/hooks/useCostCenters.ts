import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface CostCenter { id: string; codigo: string; descricao: string; is_active: boolean; created_at: string; }

export function useCostCenters() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: costCenters = [], isLoading } = useQuery({
    queryKey: ['cost-centers'],
    queryFn: async () => { const { data, error } = await supabase.from('cost_centers').select('*').order('codigo'); if (error) throw error; return data as CostCenter[]; },
  });

  const createCostCenter = useMutation({
    mutationFn: async (data: { codigo: string; descricao: string }) => { const { error } = await supabase.from('cost_centers').insert(data); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['cost-centers'] }); toast({ title: 'Centro de custo criado' }); },
    onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const updateCostCenter = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; codigo?: string; descricao?: string; is_active?: boolean }) => { const { error } = await supabase.from('cost_centers').update(data).eq('id', id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['cost-centers'] }); toast({ title: 'Centro de custo atualizado' }); },
    onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  return { costCenters, isLoading, createCostCenter, updateCostCenter };
}
