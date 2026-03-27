import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

export interface CrossCheckMismatch { calendar_event_id: string; title: string; start_at: string; google_event_id: string; process_deadline_id: string | null; reason: string; }
export interface CrossCheckResult { total_checked: number; synced_open: number; missing_in_google: CrossCheckMismatch[]; cancelled_in_google: CrossCheckMismatch[]; ok: Array<{ calendar_event_id: string; title: string; start_at: string; google_event_id: string }>; }

export function useCrossCheckCalendar() {
  const { profile, session } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<CrossCheckResult | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const runCrossCheck = useCallback(async () => {
    if (!profile?.email || !session?.access_token) { toast({ title: 'Erro', description: 'Usuário não autenticado ou email não disponível.', variant: 'destructive' }); return; }
    setIsRunning(true); setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('cross-check-calendar', { body: { userEmail: profile.email, calendarId: 'primary' } });
      if (error) throw error;
      setResult(data as CrossCheckResult);
      const totalMismatches = (data.missing_in_google?.length || 0) + (data.cancelled_in_google?.length || 0);
      toast({ title: 'Cross-check concluído', description: totalMismatches === 0 ? `${data.total_checked} eventos verificados — tudo sincronizado.` : `${totalMismatches} divergência(s) encontrada(s) em ${data.total_checked} eventos.`, variant: totalMismatches > 0 ? 'destructive' : 'default' });
    } catch (err) { console.error('Cross-check failed:', err); toast({ title: 'Erro no cross-check', description: err instanceof Error ? err.message : 'Erro desconhecido.', variant: 'destructive' }); }
    finally { setIsRunning(false); }
  }, [profile, session, toast]);

  const fixMismatches = useCallback(async (mismatches: CrossCheckMismatch[]) => {
    if (mismatches.length === 0) return;
    setIsSyncing(true);
    try {
      const ids = mismatches.map((m) => m.calendar_event_id);
      const { error } = await supabase.from('calendar_events').update({ google_event_id: null, sync_to_google: false }).in('id', ids);
      if (error) throw error;
      toast({ title: 'Divergências corrigidas', description: `${ids.length} evento(s) desvinculado(s) do Google Calendar no Axis.` });
      queryClient.invalidateQueries({ queryKey: ['internal-calendar-events'] });
      setResult((prev) => { if (!prev) return prev; const idSet = new Set(ids); return { ...prev, missing_in_google: prev.missing_in_google.filter((m) => !idSet.has(m.calendar_event_id)), cancelled_in_google: prev.cancelled_in_google.filter((m) => !idSet.has(m.calendar_event_id)) }; });
    } catch (err) { toast({ title: 'Erro ao corrigir', description: err instanceof Error ? err.message : 'Erro desconhecido.', variant: 'destructive' }); }
    finally { setIsSyncing(false); }
  }, [toast, queryClient]);

  return { runCrossCheck, fixMismatches, isRunning, isSyncing, result };
}
