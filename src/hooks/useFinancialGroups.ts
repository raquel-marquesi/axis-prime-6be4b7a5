import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface FinancialGroup { id: string; nome: string; descricao: string | null; centros_custo: string[]; is_active: boolean; created_at: string; }

export function useFinancialGroups() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const groupsQuery = useQuery({ queryKey: ['financial-groups'], queryFn: async () => { const { data, error } = await supabase.from('financial_groups').select('*').order('nome'); if (error) throw error; return data as FinancialGroup[]; } });

  const createGroup = useMutation({ mutationFn: async (group: { nome: string; descricao?: string; centros_custo?: string[] }) => { const { data, error } = await supabase.from('financial_groups').insert(group).select().single(); if (error) throw error; return data; }, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['financial-groups'] }); toast({ title: 'Grupo criado com sucesso' }); }, onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }) });
  const updateGroup = useMutation({ mutationFn: async ({ id, ...updates }: Partial<FinancialGroup> & { id: string }) => { const { data, error } = await supabase.from('financial_groups').update(updates).eq('id', id).select().single(); if (error) throw error; return data; }, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['financial-groups'] }); toast({ title: 'Grupo atualizado' }); }, onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }) });
  const deleteGroup = useMutation({ mutationFn: async (id: string) => { const { error } = await supabase.from('financial_groups').delete().eq('id', id); if (error) throw error; }, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['financial-groups'] }); toast({ title: 'Grupo excluído' }); }, onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }) });

  return { groups: groupsQuery.data || [], isLoading: groupsQuery.isLoading, createGroup, updateGroup, deleteGroup };
}
