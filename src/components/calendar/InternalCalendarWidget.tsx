import { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, MapPin, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useInternalCalendar } from '@/hooks/useInternalCalendar';
import { format, startOfWeek, endOfWeek, addWeeks, isToday, parseISO, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { CalendarEvent } from '@/types/calendar';
import { EVENT_TYPE_CONFIG } from '@/types/calendar';

interface InternalCalendarWidgetProps {
  onEventClick?: (event: CalendarEvent) => void;
}

export function InternalCalendarWidget({ onEventClick }: InternalCalendarWidgetProps) {
  const [weekOffset, setWeekOffset] = useState(0);

  const currentWeekStart = startOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 1 });
  const currentWeekEnd = endOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 1 });

  const { events, isLoading, error, refetch } = useInternalCalendar({
    startDate: currentWeekStart.toISOString(),
    endDate: currentWeekEnd.toISOString(),
  });

  useEffect(() => {
    refetch();
  }, [weekOffset, refetch]);

  const getEventDate = (event: CalendarEvent): Date => parseISO(event.start_at);

  const getEventTime = (event: CalendarEvent): string => {
    if (event.all_day) return 'Dia todo';
    return format(parseISO(event.start_at), 'HH:mm', { locale: ptBR });
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
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-primary" />
              Agenda da Semana
            </CardTitle>
            <CardDescription>
              {format(currentWeekStart, "d 'de' MMMM", { locale: ptBR })} - {format(currentWeekEnd, "d 'de' MMMM", { locale: ptBR })}
            </CardDescription>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => setWeekOffset((prev) => prev - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setWeekOffset(0)} className="text-xs">
              Hoje
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setWeekOffset((prev) => prev + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-16 w-full" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-32 text-destructive">
            <p className="text-sm">Erro ao carregar eventos</p>
          </div>
        ) : Object.keys(groupedEvents).length === 0 ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground">
            <p className="text-sm">Nenhum evento nesta semana</p>
          </div>
        ) : (
          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
            {Object.entries(groupedEvents)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([date, dayEvents]) => {
                const eventDate = parseISO(date);
                const isTodayDate = isToday(eventDate);
                return (
                  <div key={date}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-sm font-semibold ${isTodayDate ? 'text-primary' : 'text-muted-foreground'}`}>
                        {format(eventDate, "EEEE, d", { locale: ptBR })}
                      </span>
                      {isTodayDate && <Badge variant="default" className="text-xs">Hoje</Badge>}
                    </div>
                    <div className="space-y-2">
                      {dayEvents.map((event) => {
                        const typeConfig = EVENT_TYPE_CONFIG[event.event_type];
                        return (
                          <div
                            key={event.id}
                            className="p-3 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                            onClick={() => onEventClick?.(event)}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${typeConfig.color} ${typeConfig.bgColor} border-0`}>
                                    {typeConfig.label}
                                  </Badge>
                                  {event.sync_to_google && (
                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">Google</Badge>
                                  )}
                                </div>
                                <p className="font-medium text-sm truncate">{event.title}</p>
                                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {getEventTime(event)}
                                  </span>
                                  {event.location && (
                                    <span className="flex items-center gap-1 truncate">
                                      <MapPin className="h-3 w-3" />
                                      <span className="truncate max-w-[120px]">{event.location}</span>
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
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

export default InternalCalendarWidget;