import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export interface Account {
  id: string; nome: string; tipo_conta: string | null; responsavel_nome: string;
  responsavel_email: string | null; responsavel_telefone: string | null; status: string;
  client_id: string | null; branch_id: string | null; observacoes: string | null;
  created_by: string | null; created_at: string; updated_at: string;
}
export type AccountInsert = Omit<Account, 'id' | 'created_at' | 'updated_at'>;

export function useAccounts() {
  const { toast } = useToast(); const queryClient = useQueryClient(); const { user } = useAuth();
  const accountsQuery = useQuery({ queryKey: ['accounts'], queryFn: async () => { const { data, error } = await supabase.from('accounts').select('*').order('nome'); if (error) throw error; return data as Account[]; } });
  const createAccount = useMutation({ mutationFn: async (account: Omit<AccountInsert, 'created_by'>) => { const { data, error } = await supabase.from('accounts').insert({ ...account, created_by: user?.id }).select().single(); if (error) throw error; return data; }, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['accounts'] }); toast({ title: 'Conta criada com sucesso' }); }, onError: (error: Error) => { toast({ title: 'Erro ao criar conta', description: error.message, variant: 'destructive' }); } });
  const updateAccount = useMutation({ mutationFn: async ({ id, ...updates }: Partial<Account> & { id: string }) => { const { data, error } = await supabase.from('accounts').update(updates).eq('id', id).select().single(); if (error) throw error; return data; }, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['accounts'] }); toast({ title: 'Conta atualizada com sucesso' }); }, onError: (error: Error) => { toast({ title: 'Erro ao atualizar conta', description: error.message, variant: 'destructive' }); } });
  const deleteAccount = useMutation({ mutationFn: async (id: string) => { const { error } = await supabase.from('accounts').delete().eq('id', id); if (error) throw error; }, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['accounts'] }); toast({ title: 'Conta excluída com sucesso' }); }, onError: (error: Error) => { toast({ title: 'Erro ao excluir conta', description: error.message, variant: 'destructive' }); } });
  return { accounts: accountsQuery.data || [], isLoading: accountsQuery.isLoading, createAccount, updateAccount, deleteAccount };
}
