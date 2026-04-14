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
      const { data, error } = await supabase.rpc('get_dashboard_stats', { p_user_id: userId } as any);
      
      if (error) {
        console.error('Error fetching dashboard stats from RPC:', error);
        throw error;
      }

      return data as unknown as DashboardStats;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}
