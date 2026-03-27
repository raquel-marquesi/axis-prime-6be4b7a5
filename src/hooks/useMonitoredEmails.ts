import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface MonitoredEmail { id: string; email: string; label: string | null; branch_id: string | null; is_active: boolean; created_at: string; }

export function useMonitoredEmails() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: emails = [], isLoading } = useQuery({ queryKey: ['monitored-emails'], queryFn: async () => { const { data, error } = await supabase.from('monitored_emails').select('*').order('label'); if (error) throw error; return data as MonitoredEmail[]; } });
  const createEmail = useMutation({ mutationFn: async (data: { email: string; label?: string; branch_id?: string }) => { const { data: result, error } = await supabase.from('monitored_emails').insert(data).select().single(); if (error) throw error; return result; }, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['monitored-emails'] }); toast({ title: 'E-mail adicionado com sucesso' }); }, onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }) });
  const updateEmail = useMutation({ mutationFn: async ({ id, ...data }: { id: string; email?: string; label?: string; branch_id?: string | null; is_active?: boolean }) => { const { error } = await supabase.from('monitored_emails').update(data).eq('id', id); if (error) throw error; }, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['monitored-emails'] }); toast({ title: 'E-mail atualizado' }); }, onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }) });
  const deleteEmail = useMutation({ mutationFn: async (id: string) => { const { error } = await supabase.from('monitored_emails').delete().eq('id', id); if (error) throw error; }, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['monitored-emails'] }); toast({ title: 'E-mail removido' }); }, onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }) });
  const triggerProcessing = useMutation({ mutationFn: async () => { const { data, error } = await supabase.functions.invoke('process-monitored-inboxes', { method: 'POST', body: {} }); if (error) throw error; return data; }, onSuccess: (data) => { toast({ title: 'Processamento concluído', description: `${data.solicitacoes_created || 0} solicitações criadas` }); }, onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }) });

  return { emails, isLoading, createEmail, updateEmail, deleteEmail, triggerProcessing };
}
