import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, subDays } from 'date-fns';

export interface TimesheetCrossRef { count: number; ultima: string | null; }

export function useOverdueTimesheetMap(processIds: string[], earliestPrazo?: string) {
  const { session } = useAuth();
  const today = format(new Date(), 'yyyy-MM-dd');
  const lookbackDate = earliestPrazo ? format(subDays(new Date(earliestPrazo), 7), 'yyyy-MM-dd') : today;

  return useQuery({
    queryKey: ['overdue-timesheet-map', processIds.sort().join(','), lookbackDate],
    queryFn: async (): Promise<Record<string, TimesheetCrossRef>> => {
      if (processIds.length === 0) return {};
      const { data: entries } = await supabase.from('timesheet_entries').select('process_id, data_atividade').in('process_id', processIds).gte('data_atividade', lookbackDate).lte('data_atividade', today);
      const map: Record<string, TimesheetCrossRef> = {};
      if (entries) { for (const e of entries) { if (!e.process_id) continue; const existing = map[e.process_id]; if (existing) { existing.count++; if (!existing.ultima || e.data_atividade > existing.ultima) existing.ultima = e.data_atividade; } else { map[e.process_id] = { count: 1, ultima: e.data_atividade }; } } }
      return map;
    },
    enabled: !!session?.user?.id && processIds.length > 0,
    staleTime: 2 * 60 * 1000,
  });
}
