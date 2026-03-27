import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type StatusSolicitacao = 'pendente' | 'em_andamento' | 'concluida' | 'cancelada';
export type PrioridadeSolicitacao = 'baixa' | 'media' | 'alta' | 'urgente';

export interface Solicitacao {
  id: string; titulo: string; descricao: string | null; status: StatusSolicitacao;
  prioridade: PrioridadeSolicitacao; assigned_to: string | null;
  client_id: string | null; process_id: string | null;
  created_at: string; updated_at: string;
  client?: any; process?: any; assigned_user?: any;
}

export function useSolicitacoes(filters?: any) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: solicitacoes = [], isLoading, error } = useQuery({
    queryKey: ['solicitacoes', filters],
    queryFn: async () => {
      let query = supabase.from('solicitacoes')
        .select(`*, client:clients!client_id (id, nome, razao_social), process:processes!process_id (id, numero_processo, numero_pasta, reclamante_nome)`)
        .order('created_at', { ascending: false });
      if (filters?.status && filters.status !== 'all') query = query.eq('status', filters.status);
      const { data, error } = await query;
      if (error) throw error;
      return data as Solicitacao[];
    },
  });

  const pendingCount = solicitacoes.filter(s => s.status === 'pendente').length;

  const createSolicitacao = useMutation({
    mutationFn: async (formData: any) => {
      const { data: user } = await supabase.auth.getUser();
      const { data, error } = await supabase.from('solicitacoes').insert({ ...formData, created_by: user.user?.id }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['solicitacoes'] }); toast({ title: 'Solicitação criada' }); },
    onError: (error: Error) => { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); },
  });

  const updateSolicitacao = useMutation({
    mutationFn: async ({ id, ...formData }: any) => {
      const { data, error } = await supabase.from('solicitacoes').update(formData).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['solicitacoes'] }); toast({ title: 'Solicitação atualizada' }); },
    onError: (error: Error) => { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: StatusSolicitacao }) => {
      const { data, error } = await supabase.from('solicitacoes').update({ status }).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['solicitacoes'] }); toast({ title: 'Status atualizado' }); },
    onError: (error: Error) => { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); },
  });

  return { solicitacoes, pendingCount, isLoading, error, createSolicitacao, updateSolicitacao, updateStatus };
}
