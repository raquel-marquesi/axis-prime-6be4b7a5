import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type OrigemSolicitacao = 'email' | 'api' | 'manual' | 'email_sheet' | 'planilha_5_clientes';
export type StatusSolicitacao = 'pendente' | 'em_andamento' | 'concluida' | 'cancelada';
export type PrioridadeSolicitacao = 'baixa' | 'media' | 'alta' | 'urgente';

export interface Solicitacao {
  id: string;
  origem: OrigemSolicitacao;
  email_id: string | null;
  email_from: string | null;
  email_subject: string | null;
  email_snippet: string | null;
  email_date: string | null;
  client_id: string | null;
  process_id: string | null;
  titulo: string;
  descricao: string | null;
  status: StatusSolicitacao;
  prioridade: PrioridadeSolicitacao;
  assigned_to: string | null;
  data_limite: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  client?: {
    id: string;
    nome: string | null;
    razao_social: string | null;
  } | null;
  process?: {
    id: string;
    numero_processo: string;
    numero_pasta: number;
    reclamante_nome: string;
  } | null;
  assigned_user?: {
    user_id: string;
    full_name: string;
    email: string;
  } | null;
}

export interface SolicitacaoFormData {
  titulo: string;
  descricao?: string;
  origem?: OrigemSolicitacao;
  status?: StatusSolicitacao;
  prioridade?: PrioridadeSolicitacao;
  client_id?: string | null;
  process_id?: string | null;
  assigned_to?: string | null;
  data_limite?: string | null;
  email_id?: string | null;
  email_from?: string | null;
  email_subject?: string | null;
  email_snippet?: string | null;
  email_date?: string | null;
}

export interface SolicitacoesFilters {
  status?: StatusSolicitacao | 'all';
  prioridade?: PrioridadeSolicitacao | 'all';
  client_id?: string;
  assigned_to?: string;
}

export const PRIORIDADE_LABELS: Record<PrioridadeSolicitacao, string> = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
  urgente: 'Urgente',
};

export const STATUS_LABELS: Record<StatusSolicitacao, string> = {
  pendente: 'Pendente',
  em_andamento: 'Em Andamento',
  concluida: 'Concluída',
  cancelada: 'Cancelada',
};

export const ORIGEM_LABELS: Record<OrigemSolicitacao, string> = {
  email: 'E-mail',
  api: 'API',
  manual: 'Manual',
  email_sheet: 'E-mail (Planilha)',
  planilha_5_clientes: 'Planilha 5 Clientes',
};

export function useSolicitacoes(filters?: SolicitacoesFilters) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: solicitacoes = [], isLoading, error } = useQuery({
    queryKey: ['solicitacoes', filters],
    queryFn: async () => {
      let query = supabase
        .from('solicitacoes')
        .select(`
          *,
          client:clients!client_id (
            id,
            nome,
            razao_social
          ),
          process:processes!process_id (
            id,
            numero_processo,
            numero_pasta,
            reclamante_nome
          )
        `)
        .order('created_at', { ascending: false });

      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      if (filters?.prioridade && filters.prioridade !== 'all') {
        query = query.eq('prioridade', filters.prioridade);
      }
      if (filters?.client_id) {
        query = query.eq('client_id', filters.client_id);
      }
      if (filters?.assigned_to) {
        query = query.eq('assigned_to', filters.assigned_to);
      }

      const { data, error } = await query;
      if (error) throw error;

      const assignedUserIds = [...new Set(data.filter(s => s.assigned_to).map(s => s.assigned_to))];
      let profilesMap: Record<string, { user_id: string; full_name: string; email: string }> = {};
      
      if (assignedUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles_safe' as any)
          .select('user_id, full_name, email')
          .in('user_id', assignedUserIds);
        
        if (profiles) {
          profilesMap = (profiles as any[]).reduce((acc: any, p: any) => {
            acc[p.user_id] = p;
            return acc;
          }, {} as Record<string, { user_id: string; full_name: string; email: string }>);
        }
      }

      return data.map(s => ({
        ...s,
        assigned_user: s.assigned_to ? profilesMap[s.assigned_to] || null : null,
      })) as Solicitacao[];
    },
  });

  const pendingCount = solicitacoes.filter(s => s.status === 'pendente').length;

  const createSolicitacao = useMutation({
    mutationFn: async (formData: SolicitacaoFormData) => {
      const { data: user } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('solicitacoes')
        .insert({ ...formData, created_by: user.user?.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['solicitacoes'] });
      toast({ title: 'Prazo criado', description: 'O prazo foi registrado com sucesso.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao criar prazo', description: error.message, variant: 'destructive' });
    },
  });

  const updateSolicitacao = useMutation({
    mutationFn: async ({ id, ...formData }: SolicitacaoFormData & { id: string }) => {
      const { data, error } = await supabase
        .from('solicitacoes')
        .update(formData)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['solicitacoes'] });
      toast({ title: 'Prazo atualizado' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao atualizar solicitação', description: error.message, variant: 'destructive' });
    },
  });

  const deleteSolicitacao = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('solicitacoes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['solicitacoes'] });
      toast({ title: 'Solicitação removida' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao remover solicitação', description: error.message, variant: 'destructive' });
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: StatusSolicitacao }) => {
      const { data, error } = await supabase
        .from('solicitacoes')
        .update({ status })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['solicitacoes'] });
      toast({ title: 'Status atualizado' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao atualizar status', description: error.message, variant: 'destructive' });
    },
  });

  return { solicitacoes, pendingCount, isLoading, error, createSolicitacao, updateSolicitacao, deleteSolicitacao, updateStatus };
}
