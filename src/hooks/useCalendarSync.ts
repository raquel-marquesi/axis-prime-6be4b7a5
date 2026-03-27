import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCalendar } from '@/hooks/useCalendar';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import type { CalendarEvent } from '@/types/calendar';

export function useCalendarSync() {
  const { profile } = useAuth();
  const { createEvent, updateEvent, deleteEvent } = useCalendar({ userEmail: profile?.email || '' });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const buildGoogleEvent = useCallback((event: CalendarEvent) => {
    return {
      summary: event.title,
      description: event.description || undefined,
      location: event.location || undefined,
      start: event.all_day
        ? { date: event.start_at.split('T')[0] }
        : { dateTime: event.start_at, timeZone: 'America/Sao_Paulo' },
      end: event.all_day
        ? { date: event.end_at.split('T')[0] }
        : { dateTime: event.end_at, timeZone: 'America/Sao_Paulo' },
    };
  }, []);

  const syncToGoogle = useCallback(async (event: CalendarEvent): Promise<string | null> => {
    if (!profile?.email) {
      toast({ title: 'Sincronização indisponível', description: 'Email do usuário não encontrado.', variant: 'destructive' });
      return null;
    }
    try {
      const googleEvent = buildGoogleEvent(event);
      if (event.google_event_id) {
        await updateEvent(event.google_event_id, googleEvent, 'primary', profile.email);
        return event.google_event_id;
      } else {
        const result = await createEvent(googleEvent, 'primary', profile.email);
        if (result.id) {
          await supabase.from('calendar_events').update({ google_event_id: result.id, sync_to_google: true }).eq('id', event.id);
          queryClient.invalidateQueries({ queryKey: ['internal-calendar-events'] });
        }
        return result.id || null;
      }
    } catch (error) {
      console.error('Failed to sync event to Google:', error);
      toast({ title: 'Erro na sincronização', description: 'Não foi possível sincronizar com o Google Calendar.', variant: 'destructive' });
      return null;
    }
  }, [profile, buildGoogleEvent, createEvent, updateEvent, queryClient, toast]);

  const unsyncFromGoogle = useCallback(async (event: CalendarEvent): Promise<boolean> => {
    if (!event.google_event_id || !profile?.email) return false;
    try {
      await deleteEvent(event.google_event_id, 'primary', profile.email);
      await supabase.from('calendar_events').update({ google_event_id: null, sync_to_google: false }).eq('id', event.id);
      queryClient.invalidateQueries({ queryKey: ['internal-calendar-events'] });
      toast({ title: 'Sincronização removida', description: 'O evento foi removido do Google Calendar.' });
      return true;
    } catch (error) {
      console.error('Failed to unsync event from Google:', error);
      toast({ title: 'Erro ao remover sincronização', description: 'Não foi possível remover do Google Calendar.', variant: 'destructive' });
      return false;
    }
  }, [profile, deleteEvent, queryClient, toast]);

  const deleteFromGoogle = useCallback(async (googleEventId: string): Promise<boolean> => {
    if (!googleEventId || !profile?.email) return false;
    try {
      await deleteEvent(googleEventId, 'primary', profile.email);
      return true;
    } catch (error) {
      console.error('Failed to delete event from Google:', error);
      return false;
    }
  }, [profile, deleteEvent]);

  return { syncToGoogle, unsyncFromGoogle, deleteFromGoogle };
}
