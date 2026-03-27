import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ChartAccount {
  id: string;
  code: string;
  name: string;
  type: string;
  parent_id: string | null;
  level: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export function useChartOfAccounts() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['chart_of_accounts'],
    queryFn: async () => {
      const { data, error } = await supabase.from('chart_of_accounts').select('*').order('code');
      if (error) throw error;
      return data as ChartAccount[];
    },
  });

  const createAccount = useMutation({
    mutationFn: async (account: Omit<ChartAccount, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase.from('chart_of_accounts').insert(account).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['chart_of_accounts'] }); toast({ title: 'Conta criada com sucesso' }); },
    onError: (e: Error) => toast({ title: 'Erro ao criar conta', description: e.message, variant: 'destructive' }),
  });

  const updateAccount = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ChartAccount> & { id: string }) => {
      const { data, error } = await supabase.from('chart_of_accounts').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['chart_of_accounts'] }); toast({ title: 'Conta atualizada' }); },
    onError: (e: Error) => toast({ title: 'Erro ao atualizar conta', description: e.message, variant: 'destructive' }),
  });

  const deleteAccount = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('chart_of_accounts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['chart_of_accounts'] }); toast({ title: 'Conta excluída' }); },
    onError: (e: Error) => toast({ title: 'Erro ao excluir conta', description: e.message, variant: 'destructive' }),
  });

  return { accounts: query.data || [], isLoading: query.isLoading, createAccount, updateAccount, deleteAccount };
}
