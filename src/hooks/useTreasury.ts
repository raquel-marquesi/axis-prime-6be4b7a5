import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export interface TreasuryEntry {
  id: string; bank_account_id: string; tipo: string; valor: number;
  data_movimentacao: string; descricao: string | null;
  created_by: string | null; created_at: string; updated_at: string;
}

export function useTreasury() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const entriesQuery = useQuery({
    queryKey: ['treasury-entries'],
    queryFn: async () => {
      const { data, error } = await supabase.from('treasury_entries').select('*').order('data_movimentacao', { ascending: false });
      if (error) throw error;
      return data as TreasuryEntry[];
    },
  });

  const createEntry = useMutation({
    mutationFn: async (entry: any) => {
      const { data, error } = await supabase.from('treasury_entries').insert({ ...entry, created_by: user?.id } as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['treasury-entries'] }); toast({ title: 'Movimentação registrada' }); },
    onError: (error: Error) => { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); },
  });

  return { entries: entriesQuery.data || [], isLoading: entriesQuery.isLoading, createEntry };
}
