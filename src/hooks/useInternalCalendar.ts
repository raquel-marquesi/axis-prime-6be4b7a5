import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { CalendarEvent, CalendarEventInsert, CalendarEventUpdate, EventType } from '@/types/calendar';

interface UseInternalCalendarOptions {
  startDate?: string;
  endDate?: string;
  eventTypes?: EventType[];
  includeTeam?: boolean;
}

export function useInternalCalendar(options: UseInternalCalendarOptions = {}) {
  const { session } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const userId = session?.user?.id;

  const { data: events = [], isLoading, error, refetch } = useQuery({
    queryKey: ['internal-calendar-events', userId, options.startDate, options.endDate, options.eventTypes, options.includeTeam],
    queryFn: async () => {
      if (!userId) return [];
      let query = supabase.from('calendar_events').select('*').order('start_at', { ascending: true });
      if (options.startDate) query = query.gte('start_at', options.startDate);
      if (options.endDate) query = query.lte('start_at', options.endDate);
      if (options.eventTypes?.length) query = query.in('event_type', options.eventTypes);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map((event) => ({ ...event, event_type: event.event_type as EventType })) as CalendarEvent[];
    },
    enabled: !!userId,
  });

  const createEvent = useMutation({
    mutationFn: async (eventData: CalendarEventInsert) => {
      if (!userId) throw new Error('Usuário não autenticado');
      const { data, error } = await supabase.from('calendar_events').insert({ ...eventData, user_id: userId }).select().single();
      if (error) throw error;
      return data as CalendarEvent;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['internal-calendar-events'] }); toast({ title: 'Evento criado' }); },
    onError: (error: Error) => { toast({ title: 'Erro ao criar evento', description: error.message, variant: 'destructive' }); },
  });

  const updateEvent = useMutation({
    mutationFn: async ({ id, ...eventData }: CalendarEventUpdate) => {
      const { data, error } = await supabase.from('calendar_events').update(eventData).eq('id', id).select().single();
      if (error) throw error;
      return data as CalendarEvent;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['internal-calendar-events'] }); toast({ title: 'Evento atualizado' }); },
    onError: (error: Error) => { toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' }); },
  });

  const deleteEvent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('calendar_events').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['internal-calendar-events'] }); toast({ title: 'Evento removido' }); },
    onError: (error: Error) => { toast({ title: 'Erro ao remover', description: error.message, variant: 'destructive' }); },
  });

  // Deadline-specific helper methods
  const createEventFromDeadline = async (
    deadlineId: string,
    title: string,
    dateStr: string,
    description?: string | null,
    assignedTo?: string
  ) => {
    if (!userId) return;
    const targetUserId = assignedTo || userId;
    const { error } = await supabase.from('calendar_events').insert({
      user_id: targetUserId,
      title,
      description: description || null,
      start_at: `${dateStr}T09:00:00`,
      end_at: `${dateStr}T09:15:00`,
      all_day: false,
      event_type: 'prazo',
      process_deadline_id: deadlineId,
      sync_to_google: false,
    });
    if (error) console.error('Failed to create internal calendar event:', error);
  };

  const updateEventFromDeadline = async (
    deadlineId: string,
    title: string,
    dateStr: string,
    description?: string | null
  ) => {
    const { error } = await supabase
      .from('calendar_events')
      .update({
        title,
        description: description || null,
        start_at: `${dateStr}T09:00:00`,
        end_at: `${dateStr}T09:15:00`,
      })
      .eq('process_deadline_id', deadlineId);
    if (error) console.error('Failed to update internal calendar event:', error);
  };

  const deleteEventByDeadline = async (deadlineId: string) => {
    const { error } = await supabase
      .from('calendar_events')
      .delete()
      .eq('process_deadline_id', deadlineId);
    if (error) console.error('Failed to delete internal calendar event:', error);
  };

  return {
    events, isLoading, error, refetch,
    createEvent, updateEvent, deleteEvent,
    createEventFromDeadline, updateEventFromDeadline, deleteEventByDeadline,
  };
}
