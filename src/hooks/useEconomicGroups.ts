import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface EconomicGroup { id: string; nome: string; descricao: string | null; is_active: boolean; created_at: string; }
export interface ContractKey { id: string; nome: string; economic_group_id: string | null; descricao: string | null; is_active: boolean; created_at: string; }

export function useEconomicGroups() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: groups = [], isLoading: isLoadingGroups } = useQuery({
    queryKey: ['economic-groups'],
    queryFn: async () => {
      const { data, error } = await supabase.from('economic_groups').select('*').order('nome');
      if (error) throw error;
      return data as EconomicGroup[];
    },
  });

  const { data: contractKeys = [], isLoading: isLoadingKeys } = useQuery({
    queryKey: ['contract-keys'],
    queryFn: async () => {
      const { data, error } = await supabase.from('contract_keys').select('*').order('nome');
      if (error) throw error;
      return data as ContractKey[];
    },
  });

  const createGroup = useMutation({
    mutationFn: async (data: { nome: string; descricao?: string }) => {
      const { data: result, error } = await supabase.from('economic_groups').insert(data).select().single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['economic-groups'] }); toast({ title: 'Grupo criado' }); },
    onError: (error: Error) => { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); },
  });

  const createContractKey = useMutation({
    mutationFn: async (data: { nome: string; economic_group_id?: string; descricao?: string }) => {
      const { data: result, error } = await supabase.from('contract_keys').insert(data).select().single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['contract-keys'] }); toast({ title: 'Contrato-chave criado' }); },
    onError: (error: Error) => { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); },
  });

  return { groups, contractKeys, isLoadingGroups, isLoadingKeys, createGroup, createContractKey };
}
