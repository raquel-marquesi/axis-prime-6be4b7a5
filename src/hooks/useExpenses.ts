import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export interface Expense {
  id: string; descricao: string; fornecedor: string | null; categoria: string;
  valor: number; data_vencimento: string; data_pagamento: string | null;
  status: string; created_at: string; updated_at: string;
}

export function useExpenses() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const expensesQuery = useQuery({
    queryKey: ['expenses'],
    queryFn: async () => {
      const { data, error } = await supabase.from('expenses').select('*').order('data_vencimento', { ascending: true });
      if (error) throw error;
      return data as Expense[];
    },
  });

  const createExpense = useMutation({
    mutationFn: async (expense: any) => {
      const { data, error } = await supabase.from('expenses').insert({ ...expense, created_by: user?.id } as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['expenses'] }); toast({ title: 'Despesa criada' }); },
    onError: (error: Error) => { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); },
  });

  const updateExpense = useMutation({
    mutationFn: async ({ id, ...formData }: Partial<Expense> & { id: string }) => {
      const { data, error } = await supabase.from('expenses').update(formData as any).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['expenses'] }); toast({ title: 'Despesa atualizada' }); },
    onError: (error: Error) => { toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' }); },
  });

  const deleteExpense = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('expenses').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['expenses'] }); toast({ title: 'Despesa excluída' }); },
    onError: (error: Error) => { toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' }); },
  });

  const markAsPaid = useMutation({
    mutationFn: async ({ id, data_pagamento }: { id: string; data_pagamento: string }) => {
      const { data, error } = await supabase.from('expenses').update({ status: 'paga', data_pagamento }).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['expenses'] }); toast({ title: 'Despesa marcada como paga' }); },
    onError: (error: Error) => { toast({ title: 'Erro ao baixar despesa', description: error.message, variant: 'destructive' }); },
  });

  return { expenses: expensesQuery.data || [], isLoading: expensesQuery.isLoading, createExpense, updateExpense, deleteExpense, markAsPaid };
}
