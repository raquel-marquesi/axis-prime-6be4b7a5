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

export function useAllProcessDeadlines(options: UseAllProcessDeadlinesOptions = {}) {
  const { session, profile, isAdminOrManager, isCoordinatorOrAbove, isFinanceiro } = useAuth();
  const userId = session?.user?.id;
  const today = format(new Date(), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['all-process-deadlines', userId, profile?.id, options.dateFrom, options.dateTo],
    queryFn: async (): Promise<ProcessDeadlineRow[]> => {
      // Build RPC params
      let p_user_id: string | null = null;
      let p_team_user_ids: string[] | null = null;

      if (!isAdminOrManager() && !isFinanceiro()) {
        if (isCoordinatorOrAbove() && profile?.id) {
          const { data: teamProfiles } = await supabase
            .from('profiles_safe' as any)
            .select('user_id')
            .eq('reports_to', profile.id);
          const teamUserIds = (teamProfiles as any[])?.map((p: any) => p.user_id) || [];
          if (teamUserIds.length > 0) {
            p_team_user_ids = [...teamUserIds, userId!];
            p_user_id = userId!;
          } else {
            p_user_id = userId!;
          }
        } else {
          p_user_id = userId!;
        }
      }

      const { data, error } = await supabase.rpc('get_all_deadlines_with_details', {
        p_user_id: p_team_user_ids ? null : p_user_id,
        p_team_user_ids: p_team_user_ids,
        p_date_from: options.dateFrom || null,
        p_date_to: options.dateTo || null,
      } as any);

      if (error) throw error;
      if (!data || data.length === 0) return [];

      return (data as any[]).map((d) => {
        const isCompleted = d.is_completed === true;
        const dataPrazo = typeof d.data_prazo === 'string' ? d.data_prazo : format(new Date(d.data_prazo), 'yyyy-MM-dd');
        let status: DeadlineStatus;
        let diasAtraso = 0;
        if (isCompleted) {
          status = 'concluido';
        } else if (dataPrazo < today) {
          status = 'atrasado';
          diasAtraso = differenceInDays(new Date(), parseISO(dataPrazo));
        } else if (dataPrazo === today) {
          status = 'hoje';
        } else {
          status = 'futuro';
        }
        return {
          id: d.id,
          process_id: d.process_id,
          numero_processo: d.numero_processo,
          numero_pasta: d.numero_pasta,
          reclamante_nome: d.reclamante_nome,
          reclamadas: d.reclamadas || [],
          data_prazo: dataPrazo,
          ocorrencia: d.ocorrencia,
          detalhes: d.detalhes,
          is_completed: isCompleted,
          assigned_to: d.assigned_to,
          assigned_user_name: d.assigned_user_name || null,
          completed_by: d.completed_by,
          completed_by_name: d.completed_by_name || null,
          ultimo_andamento: d.ultimo_andamento,
          area: d.area,
          status,
          dias_atraso: diasAtraso,
          solicitacao_id: d.solicitacao_id,
          solicitacao_titulo: d.solicitacao_titulo || null,
          solicitacao_prioridade: d.solicitacao_prioridade || null,
        };
      });
    },
    enabled: !!userId,
    staleTime: 30 * 1000,
  });
}
