import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { differenceInDays, parseISO, format } from 'date-fns';

export type DeadlineStatus = 'atrasado' | 'hoje' | 'futuro' | 'concluido';

export interface ProcessDeadlineRow {
  id: string;
  process_id: string;
  numero_processo: string;
  numero_pasta: number;
  reclamante_nome: string;
  reclamadas: string[];
  data_prazo: string;
  ocorrencia: string;
  detalhes: string | null;
  is_completed: boolean;
  assigned_to: string | null;
  assigned_user_name: string | null;
  completed_by: string | null;
  completed_by_name: string | null;
  ultimo_andamento: string | null;
  area: string;
  status: DeadlineStatus;
  dias_atraso: number;
  solicitacao_id: string | null;
  solicitacao_titulo: string | null;
  solicitacao_prioridade: string | null;
}

interface UseAllProcessDeadlinesOptions {
  statusFilter?: DeadlineStatus | 'all';
  dateFrom?: string;
  dateTo?: string;
  excludeCompleted?: boolean;
}

export function useDeadlineCounts() {
  const { session, profile, isAdminOrManager, isCoordinatorOrAbove, isFinanceiro } = useAuth();
  const userId = session?.user?.id;
  const today = format(new Date(), 'yyyy-MM-dd');

  const buildCountQuery = async (status: DeadlineStatus | 'all') => {
    let query = supabase
      .from('process_deadlines')
      .select('id', { count: 'exact', head: true });

    if (status === 'concluido') {
      query = query.eq('is_completed', true);
    } else if (status === 'atrasado') {
      query = query.eq('is_completed', false).lt('data_prazo', today);
    } else if (status === 'hoje') {
      query = query.eq('is_completed', false).eq('data_prazo', today);
    } else if (status === 'futuro') {
      query = query.eq('is_completed', false).gt('data_prazo', today);
    }

    if (!isAdminOrManager() && !isFinanceiro()) {
      if (isCoordinatorOrAbove() && profile?.id) {
        const { data: teamProfiles } = await supabase
          .from('profiles_safe' as any)
          .select('user_id')
          .eq('reports_to', profile.id);
        const teamUserIds = teamProfiles?.map((p: any) => p.user_id) || [];
        if (teamUserIds.length > 0) {
          query = query.in('assigned_to', [...teamUserIds, userId!]);
        } else {
          query = query.eq('assigned_to', userId!);
        }
      } else {
        query = query.eq('assigned_to', userId!);
      }
    }

    const { count, error } = await query;
    if (error) throw error;
    return count || 0;
  };

  return useQuery({
    queryKey: ['deadline-counts', userId, profile?.id, today],
    queryFn: async () => {
      const [atrasado, hoje, futuro, concluido] = await Promise.all([
        buildCountQuery('atrasado'),
        buildCountQuery('hoje'),
        buildCountQuery('futuro'),
        buildCountQuery('concluido'),
      ]);
      return { atrasado, hoje, futuro, concluido };
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useAllProcessDeadlines(options: UseAllProcessDeadlinesOptions = {}) {
  const { session, profile, isAdminOrManager, isCoordinatorOrAbove, isFinanceiro } = useAuth();
  const userId = session?.user?.id;
  const today = format(new Date(), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['all-process-deadlines', userId, profile?.id, options.statusFilter, options.dateFrom, options.dateTo, options.excludeCompleted],
    queryFn: async (): Promise<ProcessDeadlineRow[]> => {
      let query = supabase
        .from('process_deadlines')
        .select(`
          id,
          process_id,
          data_prazo,
          ocorrencia,
          detalhes,
          is_completed,
          assigned_to,
          completed_by,
          ultimo_andamento,
          solicitacao_id,
          processes!inner (
            numero_processo,
            numero_pasta,
            reclamante_nome,
            reclamadas,
            area
          ),
          solicitacoes (
            titulo,
            prioridade
          )
        `)
        .order('data_prazo', { ascending: true });

      if (options.dateFrom) {
        query = query.gte('data_prazo', options.dateFrom);
      }
      if (options.dateTo) {
        query = query.lte('data_prazo', options.dateTo);
      }

      const sf = options.statusFilter;
      if (sf === 'concluido') {
        query = query.eq('is_completed', true);
      } else if (sf === 'atrasado') {
        query = query.eq('is_completed', false).lt('data_prazo', today);
      } else if (sf === 'hoje') {
        query = query.eq('is_completed', false).eq('data_prazo', today);
      } else if (sf === 'futuro') {
        query = query.eq('is_completed', false).gt('data_prazo', today);
      }

      if (options.excludeCompleted && !sf) {
        query = query.eq('is_completed', false);
      }

      if (!isAdminOrManager() && !isFinanceiro()) {
        if (isCoordinatorOrAbove() && profile?.id) {
          const { data: teamProfiles } = await supabase
            .from('profiles_safe' as any)
            .select('user_id')
            .eq('reports_to', profile.id);
          const teamUserIds = (teamProfiles as any[])?.map((p: any) => p.user_id) || [];
          if (teamUserIds.length > 0) {
            query = query.in('assigned_to', [...teamUserIds, userId!]);
          } else {
            query = query.eq('assigned_to', userId!);
          }
        } else {
          query = query.eq('assigned_to', userId!);
        }
      }

      const { data: deadlines, error } = await query;
      if (error) throw error;
      if (!deadlines || deadlines.length === 0) return [];

      const allUserIds = [...new Set(
        deadlines.flatMap((d: any) => [d.assigned_to, d.completed_by]).filter((id: any): id is string => id !== null)
      )];
      let userNames: Record<string, string> = {};
      if (allUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles_safe' as any)
          .select('user_id, full_name')
          .in('user_id', allUserIds);
        (profiles as any[])?.forEach((p: any) => { userNames[p.user_id] = p.full_name; });
      }

      return deadlines.map((d: any) => {
        const isCompleted = d.is_completed === true;
        let status: DeadlineStatus;
        let diasAtraso = 0;
        if (isCompleted) {
          status = 'concluido';
        } else if (d.data_prazo < today) {
          status = 'atrasado';
          diasAtraso = differenceInDays(new Date(), parseISO(d.data_prazo));
        } else if (d.data_prazo === today) {
          status = 'hoje';
        } else {
          status = 'futuro';
        }
        return {
          id: d.id,
          process_id: d.process_id,
          numero_processo: d.processes.numero_processo,
          numero_pasta: d.processes.numero_pasta,
          reclamante_nome: d.processes.reclamante_nome,
          reclamadas: d.processes.reclamadas || [],
          data_prazo: d.data_prazo,
          ocorrencia: d.ocorrencia,
          detalhes: d.detalhes,
          is_completed: isCompleted,
          assigned_to: d.assigned_to,
          assigned_user_name: d.assigned_to ? userNames[d.assigned_to] || null : null,
          completed_by: d.completed_by,
          completed_by_name: d.completed_by ? userNames[d.completed_by] || null : null,
          ultimo_andamento: d.ultimo_andamento,
          area: d.processes.area,
          status,
          dias_atraso: diasAtraso,
          solicitacao_id: d.solicitacao_id,
          solicitacao_titulo: d.solicitacoes?.titulo || null,
          solicitacao_prioridade: d.solicitacoes?.prioridade || null,
        };
      });
    },
    enabled: !!userId,
    staleTime: 30 * 1000,
  });
}
