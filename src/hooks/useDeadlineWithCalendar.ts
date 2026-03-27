import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCalendar } from '@/hooks/useCalendar';
import { useInternalCalendar } from '@/hooks/useInternalCalendar';
import { useAuth } from '@/contexts/AuthContext';

export interface ProcessInfo { numero_processo: string; reclamante_nome: string; numero_pasta: number; }
export interface DeadlineWithCalendarFormData { process_id: string; data_prazo: string; ocorrencia: string; detalhes?: string; assigned_to?: string; }
export interface UpdateDeadlineWithCalendarFormData extends DeadlineWithCalendarFormData { id: string; calendar_event_id?: string | null; }

export function useDeadlineWithCalendar(processInfo?: ProcessInfo) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { profile, session } = useAuth();
  const { createEvent, updateEvent, deleteEvent } = useCalendar({ userEmail: profile?.email || '' });
  const { createEventFromDeadline, updateEventFromDeadline, deleteEventByDeadline } = useInternalCalendar();

  const buildCalendarEvent = (formData: DeadlineWithCalendarFormData) => {
    if (!processInfo) return null;
    const eventTitle = `[${processInfo.numero_processo}] - ${formData.ocorrencia}`;
    const descriptionParts = [`Reclamante: ${processInfo.reclamante_nome}`];
    if (formData.detalhes) descriptionParts.push(`\nDetalhes: ${formData.detalhes}`);
    descriptionParts.push(`\nPasta: #${String(processInfo.numero_pasta).padStart(5, '0')}`);
    return { summary: eventTitle, description: descriptionParts.join(''), start: { dateTime: `${formData.data_prazo}T09:00:00`, timeZone: 'America/Sao_Paulo' }, end: { dateTime: `${formData.data_prazo}T09:15:00`, timeZone: 'America/Sao_Paulo' } };
  };

  const buildEventTitle = (formData: DeadlineWithCalendarFormData) => processInfo ? `[${processInfo.numero_processo}] - ${formData.ocorrencia}` : formData.ocorrencia;
  const buildEventDescription = (formData: DeadlineWithCalendarFormData) => {
    if (!processInfo) return formData.detalhes || null;
    const parts = [`Reclamante: ${processInfo.reclamante_nome}`];
    if (formData.detalhes) parts.push(`\nDetalhes: ${formData.detalhes}`);
    parts.push(`\nPasta: #${String(processInfo.numero_pasta).padStart(5, '0')}`);
    return parts.join('');
  };

  const createDeadlineWithCalendar = useMutation({
    mutationFn: async (formData: DeadlineWithCalendarFormData) => {
      const { data: user } = await supabase.auth.getUser();
      const { data: deadline, error: dbError } = await supabase.from('process_deadlines').insert({ process_id: formData.process_id, data_prazo: formData.data_prazo, ocorrencia: formData.ocorrencia, detalhes: formData.detalhes, assigned_to: formData.assigned_to, realizado_por: user.user?.id }).select().single();
      if (dbError) throw dbError;
      await createEventFromDeadline(deadline.id, buildEventTitle(formData), formData.data_prazo, buildEventDescription(formData), formData.assigned_to || user.user?.id);
      let calendarEventId: string | null = null;
      const currentEmail = profile?.email;
      if (processInfo && currentEmail) {
        try {
          const eventData = buildCalendarEvent(formData);
          if (eventData) {
            const calendarEvent = await createEvent(eventData, 'primary', currentEmail);
            calendarEventId = calendarEvent.id || null;
            if (calendarEventId) await supabase.from('process_deadlines').update({ calendar_event_id: calendarEventId }).eq('id', deadline.id);
          }
        } catch (calendarError) { console.error('Failed to create Google calendar event:', calendarError); }
      }
      return { ...deadline, calendar_event_id: calendarEventId };
    },
    onSuccess: (data) => { queryClient.invalidateQueries({ queryKey: ['process-deadlines'] }); queryClient.invalidateQueries({ queryKey: ['internal-calendar-events'] }); toast({ title: 'Prazo registrado', description: data.calendar_event_id ? 'O prazo foi adicionado à agenda interna e ao Google Calendar.' : 'O prazo foi adicionado à agenda interna.' }); },
    onError: (error: Error) => { toast({ title: 'Erro ao registrar prazo', description: error.message, variant: 'destructive' }); },
  });

  const updateDeadlineWithCalendar = useMutation({
    mutationFn: async (formData: UpdateDeadlineWithCalendarFormData) => {
      const { id, calendar_event_id, ...updateData } = formData;
      const { data: deadline, error: dbError } = await supabase.from('process_deadlines').update({ data_prazo: updateData.data_prazo, ocorrencia: updateData.ocorrencia, detalhes: updateData.detalhes, assigned_to: updateData.assigned_to }).eq('id', id).select().single();
      if (dbError) throw dbError;
      await updateEventFromDeadline(id, buildEventTitle(updateData), updateData.data_prazo, buildEventDescription(updateData));
      let updatedEventId = calendar_event_id;
      const currentEmail = profile?.email;
      if (processInfo && currentEmail) {
        try {
          const eventData = buildCalendarEvent(updateData);
          if (eventData) {
            if (calendar_event_id) { await updateEvent(calendar_event_id, eventData, 'primary', currentEmail); }
            else { const calendarEvent = await createEvent(eventData, 'primary', currentEmail); updatedEventId = calendarEvent.id || null; if (updatedEventId) await supabase.from('process_deadlines').update({ calendar_event_id: updatedEventId }).eq('id', id); }
          }
        } catch (calendarError) { console.error('Failed to update Google calendar event:', calendarError); }
      }
      return { ...deadline, calendar_event_id: updatedEventId };
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['process-deadlines'] }); queryClient.invalidateQueries({ queryKey: ['internal-calendar-events'] }); toast({ title: 'Prazo atualizado' }); },
    onError: (error: Error) => { toast({ title: 'Erro ao atualizar prazo', description: error.message, variant: 'destructive' }); },
  });

  const deleteDeadlineWithCalendar = useMutation({
    mutationFn: async ({ id, calendar_event_id }: { id: string; calendar_event_id?: string | null }) => {
      const currentEmail = profile?.email;
      await deleteEventByDeadline(id);
      if (calendar_event_id && currentEmail) { try { await deleteEvent(calendar_event_id, 'primary', currentEmail); } catch (calendarError) { console.error('Failed to delete Google calendar event:', calendarError); } }
      const { error } = await supabase.from('process_deadlines').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['process-deadlines'] }); queryClient.invalidateQueries({ queryKey: ['internal-calendar-events'] }); toast({ title: 'Prazo removido' }); },
    onError: (error: Error) => { toast({ title: 'Erro ao remover prazo', description: error.message, variant: 'destructive' }); },
  });

  return { createDeadlineWithCalendar, updateDeadlineWithCalendar, deleteDeadlineWithCalendar };
}
