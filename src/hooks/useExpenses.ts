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

  return { expenses: expensesQuery.data || [], isLoading: expensesQuery.isLoading, createExpense };
}
