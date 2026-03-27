import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface TaxRule { id: string; name: string; regime: string; aliquot_percentage: number; min_revenue: number | null; max_revenue: number | null; is_active: boolean; created_at: string; updated_at: string; }

export function useTaxRules() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['tax_rules'], queryFn: async () => { const { data, error } = await supabase.from('tax_rules').select('*').order('name'); if (error) throw error; return data as TaxRule[]; } });
  const createRule = useMutation({ mutationFn: async (rule: Omit<TaxRule, 'id' | 'created_at' | 'updated_at'>) => { const { data, error } = await supabase.from('tax_rules').insert(rule).select().single(); if (error) throw error; return data; }, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['tax_rules'] }); toast({ title: 'Regra tributária criada' }); }, onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }) });
  const updateRule = useMutation({ mutationFn: async ({ id, ...updates }: Partial<TaxRule> & { id: string }) => { const { data, error } = await supabase.from('tax_rules').update(updates).eq('id', id).select().single(); if (error) throw error; return data; }, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['tax_rules'] }); toast({ title: 'Regra atualizada' }); }, onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }) });
  const deleteRule = useMutation({ mutationFn: async (id: string) => { const { error } = await supabase.from('tax_rules').delete().eq('id', id); if (error) throw error; }, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['tax_rules'] }); toast({ title: 'Regra excluída' }); }, onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }) });
  return { rules: query.data || [], isLoading: query.isLoading, createRule, updateRule, deleteRule };
}
