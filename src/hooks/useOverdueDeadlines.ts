import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { differenceInDays, parseISO, format, subDays } from 'date-fns';

export interface OverdueDeadline { id: string; process_id: string; numero_processo: string; numero_pasta: number; reclamante_nome: string; data_prazo: string; ocorrencia: string; dias_atraso: number; assigned_to: string | null; assigned_user_name: string | null; area: string; atividades_count: number; ultima_atividade: string | null; tem_atividade: boolean; }

export function useOverdueDeadlines(options: { limit?: number } = {}) {
  const { session, profile, isAdminOrManager, isCoordinatorOrAbove, isFinanceiro } = useAuth();
  const userId = session?.user?.id;
  const today = format(new Date(), 'yyyy-MM-dd');
  const limit = options.limit ?? (isAdminOrManager() || isFinanceiro() ? 50 : isCoordinatorOrAbove() ? 30 : 15);

  return useQuery({
    queryKey: ['overdue-deadlines', userId, profile?.id, limit],
    queryFn: async (): Promise<OverdueDeadline[]> => {
      let query = supabase.from('process_deadlines').select(`id, process_id, data_prazo, ocorrencia, assigned_to, processes!inner (numero_processo, numero_pasta, reclamante_nome, area)`).lt('data_prazo', today).eq('is_completed', false).order('data_prazo', { ascending: true }).limit(limit);
      if (!isAdminOrManager() && !isFinanceiro()) {
        if (isCoordinatorOrAbove() && profile?.id) { const { data: teamProfiles } = await supabase.from('profiles_safe' as any).select('user_id').eq('reports_to', profile.id); const teamUserIds = teamProfiles?.map((p: any) => p.user_id) || []; if (teamUserIds.length > 0) query = query.in('assigned_to', [...teamUserIds, userId!]); else query = query.eq('assigned_to', userId!); }
        else query = query.eq('assigned_to', userId!);
      }
      const { data: deadlines, error } = await query;
      if (error) throw error;
      if (!deadlines || deadlines.length === 0) return [];

      const assignedUserIds = [...new Set(deadlines.map(d => d.assigned_to).filter((id): id is string => id !== null))];
      let userNames: Record<string, string> = {};
      if (assignedUserIds.length > 0) { const { data: profiles } = await supabase.from('profiles_safe' as any).select('user_id, full_name').in('user_id', assignedUserIds); (profiles as any[])?.forEach((p: any) => { userNames[p.user_id] = p.full_name; }); }

      const processIds = [...new Set(deadlines.map(d => d.process_id))];
      const earliestPrazo = deadlines.reduce((min, d) => d.data_prazo < min ? d.data_prazo : min, deadlines[0].data_prazo);
      const lookbackDate = format(subDays(parseISO(earliestPrazo), 7), 'yyyy-MM-dd');
      let timesheetMap: Record<string, { count: number; ultima: string | null }> = {};
      if (processIds.length > 0) { const { data: timesheetEntries } = await supabase.from('timesheet_entries').select('process_id, data_atividade').in('process_id', processIds).gte('data_atividade', lookbackDate).lte('data_atividade', today); if (timesheetEntries) { for (const entry of timesheetEntries) { if (!entry.process_id) continue; const existing = timesheetMap[entry.process_id]; if (existing) { existing.count++; if (!existing.ultima || entry.data_atividade > existing.ultima) existing.ultima = entry.data_atividade; } else { timesheetMap[entry.process_id] = { count: 1, ultima: entry.data_atividade }; } } } }

      return deadlines.map((deadline: any) => { const ts = timesheetMap[deadline.process_id]; return { id: deadline.id, process_id: deadline.process_id, numero_processo: deadline.processes.numero_processo, numero_pasta: deadline.processes.numero_pasta, reclamante_nome: deadline.processes.reclamante_nome, data_prazo: deadline.data_prazo, ocorrencia: deadline.ocorrencia, dias_atraso: differenceInDays(new Date(), parseISO(deadline.data_prazo)), assigned_to: deadline.assigned_to, assigned_user_name: deadline.assigned_to ? userNames[deadline.assigned_to] || null : null, area: deadline.processes.area, atividades_count: ts?.count ?? 0, ultima_atividade: ts?.ultima ?? null, tem_atividade: (ts?.count ?? 0) > 0 }; });
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
  });
}
