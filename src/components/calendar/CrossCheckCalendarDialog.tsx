import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RefreshCw, AlertTriangle, CheckCircle, Unlink, Loader2 } from 'lucide-react';
import { useCrossCheckCalendar, CrossCheckMismatch } from '@/hooks/useCrossCheckCalendar';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function CrossCheckCalendarDialog() {
  const [open, setOpen] = useState(false);
  const { runCrossCheck, fixMismatches, isRunning, isSyncing, result } = useCrossCheckCalendar();

  const allMismatches: CrossCheckMismatch[] = [
    ...(result?.missing_in_google || []),
    ...(result?.cancelled_in_google || []),
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-1" />
          Cross-check Google
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Cross-check: Axis × Google Calendar</DialogTitle>
          <DialogDescription>
            Verifica se os eventos sincronizados no Axis ainda existem no Google Calendar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Button onClick={runCrossCheck} disabled={isRunning} className="w-full">
            {isRunning ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Verificando...</>
            ) : (
              <><RefreshCw className="h-4 w-4 mr-2" />Executar Cross-check</>
            )}
          </Button>

          {result && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="border rounded-md p-3">
                  <p className="text-2xl font-bold">{result.total_checked}</p>
                  <p className="text-xs text-muted-foreground">Verificados</p>
                </div>
                <div className="border rounded-md p-3">
                  <p className="text-2xl font-bold text-primary">{result.synced_open}</p>
                  <p className="text-xs text-muted-foreground">Sincronizados</p>
                </div>
                <div className="border rounded-md p-3">
                  <p className="text-2xl font-bold text-destructive">{allMismatches.length}</p>
                  <p className="text-xs text-muted-foreground">Divergências</p>
                </div>
              </div>

              {allMismatches.length > 0 ? (
                <>
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium flex items-center gap-1">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                      Divergências encontradas
                    </h4>
                    <Button variant="destructive" size="sm" onClick={() => fixMismatches(allMismatches)} disabled={isSyncing}>
                      {isSyncing ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Unlink className="h-3 w-3 mr-1" />}
                      Desvincular todos
                    </Button>
                  </div>
                  <ScrollArea className="max-h-[250px]">
                    <div className="space-y-2">
                      {allMismatches.map((m) => (
                        <div key={m.calendar_event_id} className="flex items-start justify-between gap-2 border rounded-md p-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{m.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(parseISO(m.start_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </p>
                            <Badge variant="outline" className="mt-1 text-[10px] text-destructive">{m.reason}</Badge>
                          </div>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => fixMismatches([m])} disabled={isSyncing}>
                            <Unlink className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </>
              ) : (
                <div className="flex flex-col items-center gap-2 py-4 text-center">
                  <CheckCircle className="h-8 w-8 text-primary" />
                  <p className="text-sm font-medium">Tudo sincronizado!</p>
                  <p className="text-xs text-muted-foreground">
                    Todos os eventos do Axis estão presentes no Google Calendar.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}