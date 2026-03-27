import { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, MapPin, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useCalendar } from '@/hooks/useCalendar';
import { format, parseISO, startOfWeek, endOfWeek, addWeeks, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CalendarWidgetProps {
  userEmail: string;
  onEventClick?: (event: any) => void;
}

interface CalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  location?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  attendees?: Array<{ email: string; displayName?: string }>;
  htmlLink?: string;
}

export function CalendarWidget({ userEmail, onEventClick }: CalendarWidgetProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [weekOffset, setWeekOffset] = useState(0);
  const { listEvents, loading, error } = useCalendar({ userEmail });

  const currentWeekStart = startOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 1 });
  const currentWeekEnd = endOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 1 });

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const result = await listEvents('primary', currentWeekStart.toISOString(), currentWeekEnd.toISOString(), 20);
        setEvents(result);
      } catch (err) {
        console.error('Erro ao carregar eventos:', err);
      }
    };
    fetchEvents();
  }, [weekOffset, listEvents, currentWeekStart.toISOString(), currentWeekEnd.toISOString()]);

  const getEventDate = (event: CalendarEvent): Date => {
    return event.start.dateTime ? parseISO(event.start.dateTime) : parseISO(event.start.date || '');
  };

  const getEventTime = (event: CalendarEvent): string => {
    return event.start.dateTime ? format(parseISO(event.start.dateTime), 'HH:mm', { locale: ptBR }) : 'Dia todo';
  };

  const groupedEvents = events.reduce((acc, event) => {
    const date = format(getEventDate(event), 'yyyy-MM-dd');
    if (!acc[date]) acc[date] = [];
    acc[date].push(event);
    return acc;
  }, {} as Record<string, CalendarEvent[]>);

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><CalendarIcon className="h-5 w-5 text-primary" />Agenda da Semana</CardTitle>
            <CardDescription>{format(currentWeekStart, "d 'de' MMMM", { locale: ptBR })} - {format(currentWeekEnd, "d 'de' MMMM", { locale: ptBR })}</CardDescription>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => setWeekOffset((p) => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="ghost" size="sm" onClick={() => setWeekOffset(0)} className="text-xs">Hoje</Button>
            <Button variant="ghost" size="icon" onClick={() => setWeekOffset((p) => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">{[1, 2, 3].map((i) => (<div key={i} className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-16 w-full" /></div>))}</div>
        ) : error ? (
          <div className="flex items-center justify-center h-32 text-destructive"><p className="text-sm">{error}</p></div>
        ) : Object.keys(groupedEvents).length === 0 ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground"><p className="text-sm">Nenhum evento nesta semana</p></div>
        ) : (
          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
            {Object.entries(groupedEvents).sort(([a], [b]) => a.localeCompare(b)).map(([date, dayEvents]) => {
              const eventDate = parseISO(date);
              const isTodayDate = isToday(eventDate);
              return (
                <div key={date}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-sm font-semibold ${isTodayDate ? 'text-primary' : 'text-muted-foreground'}`}>{format(eventDate, "EEEE, d", { locale: ptBR })}</span>
                    {isTodayDate && <Badge variant="default" className="text-xs">Hoje</Badge>}
                  </div>
                  <div className="space-y-2">
                    {dayEvents.map((event) => (
                      <div key={event.id} className="p-3 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors cursor-pointer" onClick={() => onEventClick?.(event)}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{event.summary}</p>
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{getEventTime(event)}</span>
                              {event.location && <span className="flex items-center gap-1 truncate"><MapPin className="h-3 w-3" /><span className="truncate max-w-[120px]">{event.location}</span></span>}
                              {event.attendees && event.attendees.length > 1 && <span className="flex items-center gap-1"><Users className="h-3 w-3" />{event.attendees.length}</span>}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}