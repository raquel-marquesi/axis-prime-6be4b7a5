import { useState } from 'react';
import { RefreshCw, CheckCircle2, AlertCircle, Clock, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useSyncStatus } from '@/hooks/useSyncStatus';
import { SyncErrorsDialog } from './SyncErrorsDialog';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

function StatusIcon({ status }: { status: string }) {
  if (status === 'running') return <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />;
  if (status === 'success') return <CheckCircle2 className="h-4 w-4 text-green-500" />;
  if (status === 'error') return <AlertCircle className="h-4 w-4 text-destructive" />;
  return <AlertCircle className="h-4 w-4 text-yellow-500" />;
}

function isDuplicateError(err: string): boolean { return err.includes('duplicate key') || err.includes('uq_timesheet'); }
function getRealErrorCount(log: any): number { return (log?.details?.errors || []).filter((e: string) => !isDuplicateError(e)).length; }

function SyncLine({ label, log }: { label: string; log: any }) {
  if (!log) return <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">{label}</span><span className="text-muted-foreground text-xs">Sem dados</span></div>;
  const timeAgo = log.finished_at ? formatDistanceToNow(new Date(log.finished_at), { addSuffix: true, locale: ptBR }) : 'em andamento';
  const realErrors = getRealErrorCount(log);
  const effectiveStatus = realErrors > 0 ? log.status : (log.status === 'error' ? 'success' : log.status);
  return (
    <div className="flex items-center justify-between text-sm gap-2">
      <div className="flex items-center gap-2"><StatusIcon status={effectiveStatus} /><span className="font-medium">{label}</span></div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {log.rows_processed > 0 && <span className="text-green-600 font-medium">+{log.rows_processed}</span>}
        {realErrors > 0 && <span className="text-destructive font-medium">{realErrors} erros</span>}
        <span>{timeAgo}</span>
      </div>
    </div>
  );
}

export function SyncStatusWidget() {
  const { lastAtividades, lastExternal, lastSolicitacoes, isLoading } = useSyncStatus();
  const [errorsOpen, setErrorsOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const queryClient = useQueryClient();
  const { can } = useAuth();

  if (isLoading) return null;
  const hasAnyData = lastAtividades || lastExternal || lastSolicitacoes;
  if (!hasAnyData) return null;

  const handleSyncAll = async () => {
    setSyncing(true);
    try {
      await supabase.functions.invoke('sync-sheets', { body: { step: 'atividades' } });
      await supabase.functions.invoke('sync-external-project', { body: { force_full: true } });
      await supabase.functions.invoke('sync-solicitacoes-sheet');
      toast.success('Sincronização completa concluída');
    } catch (err: any) { toast.error('Erro na sincronização', { description: err.message }); }
    finally { setSyncing(false); queryClient.invalidateQueries({ queryKey: ['sync-status'] }); queryClient.invalidateQueries({ queryKey: ['sync-history'] }); queryClient.invalidateQueries({ queryKey: ['solicitacoes'] }); }
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2"><Clock className="h-4 w-4 text-muted-foreground" />Sincronização Google Sheets</CardTitle>
            <div className="flex items-center gap-1">
              {can('crm', 'configurar') && <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" disabled={syncing} onClick={handleSyncAll}><RefreshCw className={`h-3 w-3 ${syncing ? 'animate-spin' : ''}`} />{syncing ? 'Sincronizando...' : 'Sincronizar Tudo'}</Button>}
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => setErrorsOpen(true)}><Eye className="h-3 w-3" />Ver detalhes</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <SyncLine label="Atividades" log={lastAtividades} />
          <SyncLine label="Agendamentos Externos" log={lastExternal} />
          <SyncLine label="Prazos Planilha" log={lastSolicitacoes} />
        </CardContent>
      </Card>
      <SyncErrorsDialog open={errorsOpen} onOpenChange={setErrorsOpen} />
    </>
  );
}