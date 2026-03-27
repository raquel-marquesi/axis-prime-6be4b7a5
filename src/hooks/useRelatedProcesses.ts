import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface RelatedProcess { id: string; process_id: string; numero_processo_relacionado: string; tipo_relacao: string; observacoes: string | null; created_at: string; created_by: string | null; }
export interface RelatedProcessFormData { process_id: string; numero_processo_relacionado: string; tipo_relacao?: string; observacoes?: string; }

export function useRelatedProcesses(processId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: relatedProcesses = [], isLoading, error } = useQuery({
    queryKey: ['related-processes', processId],
    queryFn: async () => { if (!processId) return []; const { data, error } = await supabase.from('related_processes').select('*').eq('process_id', processId).order('created_at', { ascending: false }); if (error) throw error; return data as RelatedProcess[]; },
    enabled: !!processId,
  });

  const createRelatedProcess = useMutation({
    mutationFn: async (formData: RelatedProcessFormData) => { const { data: user } = await supabase.auth.getUser(); const { data, error } = await supabase.from('related_processes').insert({ ...formData, created_by: user.user?.id }).select().single(); if (error) throw error; return data; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['related-processes'] }); toast({ title: 'Processo relacionado adicionado' }); },
    onError: (error: Error) => { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); },
  });

  const deleteRelatedProcess = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('related_processes').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['related-processes'] }); toast({ title: 'Processo relacionado removido' }); },
    onError: (error: Error) => { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); },
  });

  return { relatedProcesses, isLoading, error, createRelatedProcess, deleteRelatedProcess };
}
