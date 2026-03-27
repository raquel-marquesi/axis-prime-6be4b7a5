import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface TeamClient { id: string; team_lead_id: string; client_id: string; created_at: string; created_by: string | null; client_name?: string; leader_name?: string; }

export function useTeamClients(teamLeadId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: teamClients = [], isLoading } = useQuery({
    queryKey: ['team-clients', teamLeadId],
    queryFn: async () => { let query = supabase.from('team_clients').select('*').order('created_at', { ascending: false }); if (teamLeadId) query = query.eq('team_lead_id', teamLeadId); const { data, error } = await query; if (error) throw error; return data as TeamClient[]; },
  });
  const addClient = useMutation({ mutationFn: async ({ teamLeadId, clientId }: { teamLeadId: string; clientId: string }) => { const { error } = await supabase.from('team_clients').insert({ team_lead_id: teamLeadId, client_id: clientId } as any); if (error) throw error; }, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['team-clients'] }); toast({ title: 'Sucesso', description: 'Cliente vinculado à equipe' }); }, onError: (error: any) => { toast({ variant: 'destructive', title: 'Erro', description: error.message?.includes('duplicate') ? 'Cliente já vinculado a esta equipe' : `Erro ao vincular: ${error.message}` }); } });
  const removeClient = useMutation({ mutationFn: async (id: string) => { const { error } = await supabase.from('team_clients').delete().eq('id', id); if (error) throw error; }, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['team-clients'] }); toast({ title: 'Sucesso', description: 'Vínculo removido' }); }, onError: (error) => { toast({ variant: 'destructive', title: 'Erro', description: `Erro ao remover: ${error.message}` }); } });
  return { teamClients, isLoading, addClient, removeClient };
}

export function useClientTeams(clientId?: string) {
  return useQuery({
    queryKey: ['client-teams', clientId],
    queryFn: async () => { if (!clientId) return []; const { data, error } = await supabase.from('team_clients').select('*, profiles!team_clients_team_lead_id_fkey(full_name, sigla)').eq('client_id', clientId) as any; if (error) throw error; return (data || []).map((tc: any) => ({ ...tc, leader_name: tc.profiles?.full_name || 'Desconhecido', leader_sigla: tc.profiles?.sigla || '' })); },
    enabled: !!clientId,
  });
}

export function useTeamClientCounts() {
  return useQuery({
    queryKey: ['team-client-counts'],
    queryFn: async () => { const { data, error } = await supabase.from('team_clients').select('team_lead_id'); if (error) throw error; const counts = new Map<string, number>(); (data || []).forEach((tc) => { counts.set(tc.team_lead_id, (counts.get(tc.team_lead_id) || 0) + 1); }); return counts; },
  });
}
