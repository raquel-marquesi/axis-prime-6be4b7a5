import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Branch { id: string; nome: string; is_active: boolean; created_at: string; }

export function useBranches() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: branches = [], isLoading } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const { data, error } = await supabase.from('branches').select('*').order('nome');
      if (error) throw error;
      return data as Branch[];
    },
  });

  const activeBranches = branches.filter(b => b.is_active);

  const createBranch = useMutation({
    mutationFn: async (data: { nome: string }) => {
      const { data: result, error } = await supabase.from('branches').insert(data).select().single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['branches'] }); toast({ title: 'Filial criada' }); },
    onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  return { branches, activeBranches, isLoading, createBranch };
}
