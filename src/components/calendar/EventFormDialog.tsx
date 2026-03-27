import { useState } from 'react';
import { Calendar, Clock, MapPin, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useInternalCalendar } from '@/hooks/useInternalCalendar';
import { useCalendarSync } from '@/hooks/useCalendarSync';
import { format, addHours } from 'date-fns';
import type { CalendarEvent, EventType, CalendarEventInsert } from '@/types/calendar';
import { EVENT_TYPE_CONFIG } from '@/types/calendar';

interface EventFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event?: CalendarEvent | null;
  onEventSaved?: () => void;
}

export function EventFormDialog({
  open,
  onOpenChange,
  event,
  onEventSaved,
}: EventFormDialogProps) {
  const now = new Date();
  const defaultStart = format(addHours(now, 1), "yyyy-MM-dd'T'HH:00");
  const defaultEnd = format(addHours(now, 2), "yyyy-MM-dd'T'HH:00");

  const [title, setTitle] = useState(event?.title || '');
  const [description, setDescription] = useState(event?.description || '');
  const [location, setLocation] = useState(event?.location || '');
  const [startAt, setStartAt] = useState(
    event?.start_at ? format(new Date(event.start_at), "yyyy-MM-dd'T'HH:mm") : defaultStart
  );
  const [endAt, setEndAt] = useState(
    event?.end_at ? format(new Date(event.end_at), "yyyy-MM-dd'T'HH:mm") : defaultEnd
  );
  const [allDay, setAllDay] = useState(event?.all_day || false);
  const [eventType, setEventType] = useState<EventType>(event?.event_type || 'outro');
  const [syncToGoogle, setSyncToGoogle] = useState(event?.sync_to_google || false);
  const [saving, setSaving] = useState(false);

  const { createEvent, updateEvent } = useInternalCalendar();
  const { syncToGoogle: syncEventToGoogle } = useCalendarSync();

  const handleSave = async () => {
    if (!title.trim()) return;

    setSaving(true);
    try {
      const eventData: CalendarEventInsert = {
        title: title.trim(),
        description: description.trim() || null,
        location: location.trim() || null,
        start_at: new Date(startAt).toISOString(),
        end_at: new Date(endAt).toISOString(),
        all_day: allDay,
        event_type: eventType,
        sync_to_google: syncToGoogle,
      };

      let savedEvent: CalendarEvent;

      if (event) {
        savedEvent = await updateEvent.mutateAsync({ id: event.id, ...eventData });
      } else {
        savedEvent = await createEvent.mutateAsync(eventData);
      }

      if (syncToGoogle && savedEvent) {
        await syncEventToGoogle(savedEvent);
      }

      onOpenChange(false);
      onEventSaved?.();
      resetForm();
    } catch (error) {
      console.error('Failed to save event:', error);
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setLocation('');
    setStartAt(defaultStart);
    setEndAt(defaultEnd);
    setAllDay(false);
    setEventType('outro');
    setSyncToGoogle(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {event ? 'Editar Evento' : 'Novo Evento'}
          </DialogTitle>
          <DialogDescription>
            {event ? 'Atualize as informações do evento' : 'Adicione um novo evento à sua agenda'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título do Evento</Label>
            <Input
              id="title"
              placeholder="Ex: Reunião com cliente"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="event-type">Tipo de Evento</Label>
            <Select value={eventType} onValueChange={(v) => setEventType(v as EventType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(EVENT_TYPE_CONFIG).map(([type, config]) => (
                  <SelectItem key={type} value={type}>
                    <span className={config.color}>{config.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="all-day">Dia inteiro</Label>
            <Switch id="all-day" checked={allDay} onCheckedChange={setAllDay} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start" className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Início
              </Label>
              <Input
                id="start"
                type={allDay ? 'date' : 'datetime-local'}
                value={allDay ? startAt.split('T')[0] : startAt}
                onChange={(e) => setStartAt(allDay ? `${e.target.value}T00:00` : e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end">Fim</Label>
              <Input
                id="end"
                type={allDay ? 'date' : 'datetime-local'}
                value={allDay ? endAt.split('T')[0] : endAt}
                onChange={(e) => setEndAt(allDay ? `${e.target.value}T23:59` : e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location" className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              Local (opcional)
            </Label>
            <Input
              id="location"
              placeholder="Ex: Sala de reuniões / Link do Google Meet"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição (opcional)</Label>
            <Textarea
              id="description"
              placeholder="Detalhes do evento..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>

          <div className="flex items-center justify-between border-t pt-4">
            <div>
              <Label htmlFor="sync-google">Sincronizar com Google Calendar</Label>
              <p className="text-xs text-muted-foreground">
                O evento também será adicionado ao seu Google Calendar
              </p>
            </div>
            <Switch id="sync-google" checked={syncToGoogle} onCheckedChange={setSyncToGoogle} />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            <X className="h-4 w-4 mr-1" />
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || !title.trim()}>
            <Calendar className="h-4 w-4 mr-1" />
            {saving ? 'Salvando...' : event ? 'Salvar' : 'Criar Evento'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default EventFormDialog;