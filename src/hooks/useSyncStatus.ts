import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SyncLog { id: string; started_at: string; finished_at: string | null; sheet_type: string; rows_found: number; rows_processed: number; rows_failed: number; status: string; details: { errors?: string[]; skipped?: number } | null; error_message: string | null; }

export function useSyncStatus() {
  const { data: lastSync, isLoading } = useQuery({
    queryKey: ['sync-status'],
    queryFn: async () => { const { data, error } = await supabase.from('sync_logs').select('*').order('started_at', { ascending: false }).limit(10); if (error) throw error; return data as SyncLog[]; },
    refetchInterval: 60000,
  });
  const lastAtividades = lastSync?.find(l => l.sheet_type === 'atividades');
  const lastExternal = lastSync?.find(l => l.sheet_type === 'external_agendamentos');
  const lastSolicitacoes = lastSync?.find(l => l.sheet_type === 'solicitacoes_sheet');
  return { lastSync, lastAtividades, lastExternal, lastSolicitacoes, isLoading };
}

export function useSyncHistory() {
  return useQuery({
    queryKey: ['sync-history'],
    queryFn: async () => { const { data, error } = await supabase.from('sync_logs').select('*').order('started_at', { ascending: false }).limit(20); if (error) throw error; return data as SyncLog[]; },
  });
}
