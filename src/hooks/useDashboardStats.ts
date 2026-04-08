import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { addDays, format } from 'date-fns';

interface DeadlineByUser {
  user_name: string;
  pending: number;
  overdue: number;
}

interface DashboardStats {
  activeClients: number;
  totalProcesses: number;
  pendingDeadlines: number;
  overdueDeadlines: number;
  contractsExpiring30: number;
  contractsExpiring60: number;
  contractsExpiring90: number;
  deadlinesByUser: DeadlineByUser[];
}

export function useDashboardStats() {
  const { session, isCoordinatorOrAbove } = useAuth();
  const userId = session?.user?.id;
  const isCoordPlus = isCoordinatorOrAbove();
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');
  const in7days = format(addDays(today, 7), 'yyyy-MM-dd');
  const in30days = format(addDays(today, 30), 'yyyy-MM-dd');
  const in60days = format(addDays(today, 60), 'yyyy-MM-dd');
  const in90days = format(addDays(today, 90), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['dashboard-stats', userId, isCoordPlus],
    queryFn: async (): Promise<DashboardStats> => {
      // Active clients
      const { count: activeClients } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      // Pending deadlines (next 7 days) — scoped by role
      let pendingQuery = supabase
        .from('process_deadlines')
        .select('*', { count: 'exact', head: true })
        .eq('is_completed', false)
        .gte('data_prazo', todayStr)
        .lte('data_prazo', in7days);
      if (!isCoordPlus) pendingQuery = pendingQuery.eq('assigned_to', userId!);
      const { count: pendingDeadlines } = await pendingQuery;

      // Overdue deadlines — scoped by role
      let overdueQuery = supabase
        .from('process_deadlines')
        .select('*', { count: 'exact', head: true })
        .eq('is_completed', false)
        .lt('data_prazo', todayStr);
      if (!isCoordPlus) overdueQuery = overdueQuery.eq('assigned_to', userId!);
      const { count: overdueDeadlines } = await overdueQuery;

      // Contracts expiring in 30/60/90 days
      const contractQuery = (maxDate: string) =>
        supabase
          .from('clients')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true)
          .gte('contrato_data_vencimento', todayStr)
          .lte('contrato_data_vencimento', maxDate);

      const [c30, c60, c90] = await Promise.all([
        contractQuery(in30days),
        contractQuery(in60days),
        contractQuery(in90days),
      ]);

      // Deadlines by user (for coordinators+)
      let deadlinesByUser: DeadlineByUser[] = [];
      if (isCoordPlus) {
        const { data: rawDeadlines } = await supabase
          .from('process_deadlines')
          .select('assigned_to, data_prazo, is_completed')
          .eq('is_completed', false);

        if (rawDeadlines && rawDeadlines.length > 0) {
          // Get unique assigned_to ids
          const userIds = [...new Set(rawDeadlines.map(d => d.assigned_to).filter(Boolean))] as string[];

          // Fetch profile names
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, full_name')
            .in('user_id', userIds);

          const nameMap = new Map((profiles || []).map(p => [p.user_id, p.full_name]));

          // Group by user
          const grouped = new Map<string, { pending: number; overdue: number }>();
          for (const d of rawDeadlines) {
            if (!d.assigned_to) continue;
            if (!grouped.has(d.assigned_to)) grouped.set(d.assigned_to, { pending: 0, overdue: 0 });
            const entry = grouped.get(d.assigned_to)!;
            if (d.data_prazo < todayStr) entry.overdue++;
            else entry.pending++;
          }

          deadlinesByUser = Array.from(grouped.entries())
            .map(([uid, counts]) => ({
              user_name: nameMap.get(uid) || 'Desconhecido',
              ...counts,
            }))
            .sort((a, b) => b.overdue - a.overdue || b.pending - a.pending);
        }
      }

      return {
        activeClients: activeClients || 0,
        totalProcesses: 0,
        pendingDeadlines: pendingDeadlines || 0,
        overdueDeadlines: overdueDeadlines || 0,
        contractsExpiring30: c30.count || 0,
        contractsExpiring60: c60.count || 0,
        contractsExpiring90: c90.count || 0,
        deadlinesByUser,
      };
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}
