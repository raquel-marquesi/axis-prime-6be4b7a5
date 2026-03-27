import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useCalendar({ userEmail }: { userEmail: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { session } = useAuth();

  const callCalendarFunction = useCallback(async (payload: Record<string, unknown>) => {
    if (!session?.access_token) throw new Error('Usuário não autenticado');
    if (!userEmail) throw new Error('Email do usuário não disponível');
    const { data, error } = await supabase.functions.invoke('google-calendar', {
      body: { ...payload, userEmail },
    });
    if (error) throw error;
    return data;
  }, [session, userEmail]);

  const listEvents = useCallback(async (calendarId = 'primary', timeMin?: string, timeMax?: string, maxResults = 50) => {
    setLoading(true); setError(null);
    try {
      const result = await callCalendarFunction({ action: 'listEvents', calendarId, timeMin, timeMax, maxResults });
      return result.events;
    } catch (err: any) { setError(err.message); throw err; } finally { setLoading(false); }
  }, [callCalendarFunction]);

  return { loading, error, listEvents };
}
