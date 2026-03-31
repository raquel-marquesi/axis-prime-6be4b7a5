import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ProcessDeadline {
  id: string; process_id: string; data_prazo: string; ocorrencia: string;
  detalhes: string | null; assigned_to: string | null; is_completed: boolean;
  completed_at: string | null; completed_by: string | null;
  document_url: string | null; calendar_event_id: string | null; created_at: string; updated_at: string;
  solicitacao_id: string | null;
  solicitacao?: { titulo: string; prioridade: string; client_id: string | null } | null;
}

export interface DeadlineFormData {
  process_id: string; data_prazo: string; ocorrencia: string;
  detalhes?: string; assigned_to?: string;
}

export function useProcessDeadlines(processId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: deadlines = [], isLoading, error } = useQuery({
    queryKey: ['process-deadlines', processId],
    queryFn: async () => {
      if (!processId) return [];
      const { data, error } = await supabase.from('process_deadlines').select('*, solicitacoes(titulo, prioridade, client_id)').eq('process_id', processId).order('data_prazo', { ascending: false });
      if (error) throw error;
      return (data || []).map((d: any) => ({ ...d, solicitacao: d.solicitacoes || null })) as ProcessDeadline[];
    },
    enabled: !!processId,
  });

  const createDeadline = useMutation({
    mutationFn: async (formData: DeadlineFormData) => {
      const { data: user } = await supabase.auth.getUser();
      const { data, error } = await supabase.from('process_deadlines').insert({ ...formData, realizado_por: user.user?.id, source: 'manual' }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['process-deadlines'] }); toast({ title: 'Prazo registrado' }); },
    onError: (error: Error) => { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); },
  });

  return { deadlines, isLoading, error, createDeadline };
}
