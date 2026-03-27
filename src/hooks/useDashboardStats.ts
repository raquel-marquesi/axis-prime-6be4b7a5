import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { startOfMonth, endOfMonth, addDays, format } from 'date-fns';

export function useDashboardStats() {
  const { session, profile, isCoordinatorOrAbove, isAdminOrManager, isFinanceiro } = useAuth();
  const userId = session?.user?.id;
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');
  const monthStart = format(startOfMonth(today), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(today), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['dashboard-stats', userId],
    queryFn: async () => {
      const stats: any = { activeClients: 0, totalProcesses: 0, pendingDeadlines: 0, overdueDeadlines: 0, monthlyActivities: 0 };
      const { count: clientsCount } = await supabase.from('clients').select('*', { count: 'exact', head: true }).eq('is_active', true);
      stats.activeClients = clientsCount || 0;
      const { count: processesCount } = await supabase.from('processes').select('*', { count: 'exact', head: true });
      stats.totalProcesses = processesCount || 0;
      const { count: pendingCount } = await supabase.from('process_deadlines').select('*', { count: 'exact', head: true }).gte('data_prazo', todayStr).eq('is_completed', false);
      stats.pendingDeadlines = pendingCount || 0;
      const { count: overdueCount } = await supabase.from('process_deadlines').select('*', { count: 'exact', head: true }).lt('data_prazo', todayStr).eq('is_completed', false);
      stats.overdueDeadlines = overdueCount || 0;
      return stats;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}
