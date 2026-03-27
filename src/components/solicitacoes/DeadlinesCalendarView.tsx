import { useMemo, useState } from 'react';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, format, isSameMonth, isSameDay,
  addMonths, subMonths, parseISO,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import type { DeadlineStatus, ProcessDeadlineRow } from '@/hooks/useAllProcessDeadlines';

const STATUS_COLORS: Record<DeadlineStatus, string> = {
  atrasado: 'bg-destructive text-destructive-foreground',
  hoje: 'bg-yellow-500 text-white',
  futuro: 'bg-blue-500 text-white',
  concluido: 'bg-muted text-muted-foreground',
};

interface Props {
  deadlines: ProcessDeadlineRow[];
  onDeadlineClick: (row: ProcessDeadlineRow) => void;
}

const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

export function DeadlinesCalendarView({ deadlines, onDeadlineClick }: Props) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const start = startOfWeek(monthStart, { weekStartsOn: 1 });
    const end = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const deadlinesByDate = useMemo(() => {
    const map = new Map<string, ProcessDeadlineRow[]>();
    deadlines.forEach(d => {
      const key = d.data_prazo;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(d);
    });
    return map;
  }, [deadlines]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="outline" size="icon" onClick={() => setCurrentMonth(m => subMonths(m, 1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-lg font-semibold capitalize">
          {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
        </h3>
        <Button variant="outline" size="icon" onClick={() => setCurrentMonth(m => addMonths(m, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-px rounded-lg border bg-border overflow-hidden">
        {WEEKDAYS.map(day => (
          <div key={day} className="bg-muted px-2 py-2 text-center text-xs font-medium text-muted-foreground">
            {day}
          </div>
        ))}

        <TooltipProvider delayDuration={200}>
          {calendarDays.map(day => {
            const key = format(day, 'yyyy-MM-dd');
            const dayDeadlines = deadlinesByDate.get(key) || [];
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isToday = isSameDay(day, new Date());

            return (
              <div
                key={key}
                className={`bg-background min-h-[90px] p-1.5 ${
                  !isCurrentMonth ? 'opacity-40' : ''
                } ${isToday ? 'ring-2 ring-primary ring-inset' : ''}`}
              >
                <span className={`text-xs font-medium ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>
                  {format(day, 'd')}
                </span>
                <div className="mt-1 space-y-0.5 max-h-[60px] overflow-y-auto">
                  {dayDeadlines.slice(0, 4).map(d => (
                    <Tooltip key={d.id}>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => onDeadlineClick(d)}
                          className={`w-full text-left rounded px-1 py-0.5 text-[10px] leading-tight truncate cursor-pointer ${STATUS_COLORS[d.status]}`}
                        >
                          {d.numero_processo.length > 15
                            ? d.numero_processo.slice(-10)
                            : d.numero_processo}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-xs">
                        <p className="font-medium">{d.numero_processo}</p>
                        <p className="text-xs">Reclamante: {d.reclamante_nome}</p>
                        <p className="text-xs">Ocorrência: {d.ocorrencia}</p>
                        {d.assigned_user_name && (
                          <p className="text-xs">Responsável: {d.assigned_user_name}</p>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  ))}
                  {dayDeadlines.length > 4 && (
                    <span className="text-[10px] text-muted-foreground px-1">
                      +{dayDeadlines.length - 4} mais
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </TooltipProvider>
      </div>

      <div className="flex gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-destructive" /> Atrasado</span>
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-yellow-500" /> Hoje</span>
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-blue-500" /> Futuro</span>
      </div>
    </div>
  );
}