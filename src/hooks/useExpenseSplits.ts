import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ExpenseSplit { id: string; expense_id: string; centro_custo: string; percentual: number; valor: number; created_at: string; }

export function useExpenseSplits(expenseId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const splitsQuery = useQuery({
    queryKey: ['expense-splits', expenseId],
    queryFn: async () => { if (!expenseId) return []; const { data, error } = await supabase.from('expense_splits').select('*').eq('expense_id', expenseId).order('created_at'); if (error) throw error; return data as ExpenseSplit[]; },
    enabled: !!expenseId,
  });

  const saveSplits = useMutation({
    mutationFn: async ({ expenseId, splits }: { expenseId: string; splits: { centro_custo: string; percentual: number; valor: number }[] }) => {
      await supabase.from('expense_splits').delete().eq('expense_id', expenseId);
      if (splits.length > 0) { const { error } = await supabase.from('expense_splits').insert(splits.map(s => ({ expense_id: expenseId, ...s }))); if (error) throw error; }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['expense-splits'] }); toast({ title: 'Rateio salvo com sucesso' }); },
    onError: (error: Error) => { toast({ title: 'Erro ao salvar rateio', description: error.message, variant: 'destructive' }); },
  });

  return { splits: splitsQuery.data || [], isLoading: splitsQuery.isLoading, saveSplits };
}
