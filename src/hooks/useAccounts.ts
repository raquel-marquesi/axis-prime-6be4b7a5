import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export interface Account {
  id: string; nome: string; tipo_conta: string | null; responsavel_nome: string;
  responsavel_email: string | null; status: string; client_id: string | null;
  branch_id: string | null; created_at: string; updated_at: string;
}

export function useAccounts() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const accountsQuery = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const { data, error } = await supabase.from('accounts').select('*').order('nome');
      if (error) throw error;
      return data as Account[];
    },
  });

  const createAccount = useMutation({
    mutationFn: async (account: any) => {
      const { data, error } = await supabase.from('accounts').insert({ ...account, created_by: user?.id }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['accounts'] }); toast({ title: 'Conta criada' }); },
    onError: (error: Error) => { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); },
  });

  return { accounts: accountsQuery.data || [], isLoading: accountsQuery.isLoading, createAccount };
}
