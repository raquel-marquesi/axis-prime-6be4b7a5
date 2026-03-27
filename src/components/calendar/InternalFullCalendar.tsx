import { useState, useMemo, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  MapPin,
} from 'lucide-react';
import { CrossCheckCalendarDialog } from '@/components/calendar/CrossCheckCalendarDialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useInternalCalendar } from '@/hooks/useInternalCalendar';
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { CalendarEvent } from '@/types/calendar';
import { EVENT_TYPE_CONFIG } from '@/types/calendar';

interface InternalFullCalendarProps {
  onAddEvent?: () => void;
  onEventClick?: (event: CalendarEvent) => void;
}

const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

export function InternalFullCalendar({ onAddEvent, onEventClick }: InternalFullCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const { events, isLoading, error, refetch } = useInternalCalendar({
    startDate: calendarStart.toISOString(),
    endDate: calendarEnd.toISOString(),
  });

  useEffect(() => {
    refetch();
  }, [currentMonth, refetch]);

  const days = useMemo(
    () => eachDayOfInterval({ start: calendarStart, end: calendarEnd }),
    [calendarStart.toISOString(), calendarEnd.toISOString()]
  );

  const getEventsForDay = (day: Date): CalendarEvent[] => {
    return events.filter((event) => isSameDay(parseISO(event.start_at), day));
  };

  const getEventTime = (event: CalendarEvent): string => {
    if (event.all_day) return '';
    return format(parseISO(event.start_at), 'HH:mm');
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-primary" />
            {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(new Date())} className="text-xs">
              Hoje
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <CrossCheckCalendarDialog />
            {onAddEvent && (
              <Button variant="default" size="sm" onClick={onAddEvent} className="ml-2">
                <Plus className="h-4 w-4 mr-1" />
                Evento
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-2">
        {isLoading ? (
          <div className="grid grid-cols-7 gap-1">
            {WEEKDAYS.map((day) => (
              <div key={day} className="text-center text-xs font-medium text-muted-foreground p-2">{day}</div>
            ))}
            {Array.from({ length: 35 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-64 text-destructive">
            <p className="text-sm">Erro ao carregar eventos</p>
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {WEEKDAYS.map((day) => (
              <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">{day}</div>
            ))}
            {days.map((day) => {
              const dayEvents = getEventsForDay(day);
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isTodayDate = isToday(day);
              return (
                <div
                  key={day.toISOString()}
                  className={`min-h-[80px] p-1 border rounded-md transition-colors ${isCurrentMonth ? 'bg-card' : 'bg-muted/30'} ${isTodayDate ? 'border-primary' : 'border-border'}`}
                >
                  <div className={`text-xs font-medium mb-1 ${isTodayDate ? 'text-primary' : isCurrentMonth ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {format(day, 'd')}
                  </div>
                  <div className="space-y-0.5 max-h-[60px] overflow-hidden">
                    <TooltipProvider>
                      {dayEvents.slice(0, 3).map((event) => {
                        const typeConfig = EVENT_TYPE_CONFIG[event.event_type];
                        return (
                          <Tooltip key={event.id}>
                            <TooltipTrigger asChild>
                              <div
                                className={`text-[10px] p-0.5 px-1 rounded truncate cursor-pointer hover:opacity-80 ${typeConfig.bgColor} ${typeConfig.color}`}
                                onClick={() => onEventClick?.(event)}
                              >
                                {getEventTime(event) && <span className="font-medium mr-1">{getEventTime(event)}</span>}
                                {event.title}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="max-w-[250px]">
                              <div className="space-y-1">
                                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${typeConfig.color} ${typeConfig.bgColor} border-0`}>
                                  {typeConfig.label}
                                </Badge>
                                <p className="font-semibold">{event.title}</p>
                                {getEventTime(event) && (
                                  <p className="text-xs flex items-center gap-1"><Clock className="h-3 w-3" />{getEventTime(event)}</p>
                                )}
                                {event.location && (
                                  <p className="text-xs flex items-center gap-1"><MapPin className="h-3 w-3" />{event.location}</p>
                                )}
                                {event.description && (
                                  <p className="text-xs text-muted-foreground line-clamp-2">{event.description}</p>
                                )}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </TooltipProvider>
                    {dayEvents.length > 3 && (
                      <div className="text-[10px] text-muted-foreground text-center">+{dayEvents.length - 3} mais</div>
                    )}
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

export default InternalFullCalendar;