import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { addDays, format } from 'date-fns';

interface DeadlineByUser {
  user_name: string;
  pending: number;
  overdue: number;
}

export interface DashboardStats {
  activeClients: number;
  totalProcesses: number;
  pendingDeadlines: number;
  overdueDeadlines: number;
  contractsExpiring30: number;
  contractsExpiring60: number;
  contractsExpiring90: number;
  deadlinesByUser: DeadlineByUser[];
  clientsByType: { fisica: number; juridica: number };
  teamMembers: number;
  teamPendingDeadlines: number;
  teamOverdueDeadlines: number;
  teamMonthlyActivities: number;
}

export function useDashboardStats() {
  const { session, roles, isCoordinatorOrAbove } = useAuth();
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
      // 0. Get team user IDs for scope alignment
      let teamUserIds: string[] | null = null;
      let bypassFilters = false;

      // Admins and partners see everything, they bypass team filters entirely
      if (roles.includes('admin') || roles.includes('socio') || roles.includes('gerente')) {
        bypassFilters = true;
      } else if (isCoordPlus) {
        const { data: myProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', userId!)
          .maybeSingle();

        if (myProfile) {
          const { data: subordinates } = await supabase
            .from('profiles_safe' as any)
            .select('user_id')
            .eq('reports_to', myProfile.id);
          
          const subordinateIds = (subordinates as any[])?.map((p: any) => p.user_id) || [];
          teamUserIds = [...subordinateIds, userId!];
        }
      }

      // Active clients + by type
      const { count: activeClients } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      const { count: pfCount } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
        .eq('tipo', 'fisica');

      const { count: pjCount } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
        .eq('tipo', 'juridica');

      // Pending deadlines (Today + Future) — scoped by role/team
      let pendingQuery = supabase
        .from('process_deadlines')
        .select('*', { count: 'exact', head: true })
        .eq('is_completed', false)
        .gte('data_prazo', todayStr);
      
      if (!bypassFilters) {
        if (teamUserIds) {
          pendingQuery = pendingQuery.in('assigned_to', teamUserIds);
        } else {
          pendingQuery = pendingQuery.eq('assigned_to', userId!);
        }
      }
      const { count: pendingDeadlines } = await pendingQuery;

      // Overdue deadlines — scoped by role/team
      let overdueQuery = supabase
        .from('process_deadlines')
        .select('*', { count: 'exact', head: true })
        .eq('is_completed', false)
        .lt('data_prazo', todayStr);
      
      if (!bypassFilters) {
        if (teamUserIds) {
          overdueQuery = overdueQuery.in('assigned_to', teamUserIds);
        } else {
          overdueQuery = overdueQuery.eq('assigned_to', userId!);
        }
      }
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

      // Deadlines by user + team stats
      let deadlinesByUser: DeadlineByUser[] = [];
      let teamMembersCount = 0;
      
      if (bypassFilters) {
        // Admin sees all deadlines assigned to anyone
        const { data: rawDeadlines } = await supabase
          .from('process_deadlines')
          .select('assigned_to, data_prazo, is_completed')
          .eq('is_completed', false);

        if (rawDeadlines && rawDeadlines.length > 0) {
          const distinctUserIds = [...new Set(rawDeadlines.map((d: any) => d.assigned_to).filter(Boolean))] as string[];
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, full_name')
            .in('user_id', distinctUserIds);

          const nameMap = new Map((profiles || []).map((p: any) => [p.user_id, p.full_name]));
          teamMembersCount = distinctUserIds.length;
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
      } else if (teamUserIds) {
        teamMembersCount = teamUserIds.length;
        
        const { data: rawDeadlines } = await supabase
          .from('process_deadlines')
          .select('assigned_to, data_prazo, is_completed')
          .eq('is_completed', false)
          .in('assigned_to', teamUserIds);

        if (rawDeadlines && rawDeadlines.length > 0) {
          const distinctUserIds = [...new Set(rawDeadlines.map(d => d.assigned_to).filter(Boolean))] as string[];
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, full_name')
            .in('user_id', distinctUserIds);

          const nameMap = new Map((profiles || []).map(p => [p.user_id, p.full_name]));
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
        clientsByType: { fisica: pfCount || 0, juridica: pjCount || 0 },
        teamMembers: teamMembersCount,
        teamPendingDeadlines: pendingDeadlines || 0,
        teamOverdueDeadlines: overdueDeadlines || 0,
        teamMonthlyActivities: 0,
      };
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}
