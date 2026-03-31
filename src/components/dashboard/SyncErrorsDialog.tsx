import { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronRight, FileSpreadsheet, CheckCircle2, AlertCircle, XCircle, UserX, UserSearch, Database, Info, ExternalLink, HelpCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useSyncHistory, type SyncLog } from '@/hooks/useSyncStatus';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { LinkClientPopover } from './LinkClientPopover';
import { LinkUserPopover } from './LinkUserPopover';

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = { success: { label: 'Sucesso', variant: 'default' }, partial: { label: 'Parcial', variant: 'secondary' }, error: { label: 'Erro', variant: 'destructive' }, running: { label: 'Executando', variant: 'outline' } };
  const cfg = map[status] || { label: status, variant: 'outline' as const };
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}

function isDuplicateError(error: string): boolean { return error.includes('duplicate key') || error.includes('uq_timesheet'); }

function parseErrorLine(error: string) {
  const rowMatch = error.match(/^L(\d+):\s*(.+)$/);
  const row = rowMatch ? `Linha ${rowMatch[1]}` : '';
  const message = rowMatch ? rowMatch[2] : error;
  const clientMatch = message.match(/cliente\s+"([^"]+)"/i) || message.match(/cliente\s+(\S+)/i);
  const responsibleMatch = message.match(/responsavel\s+"([^"]+)"/i) || message.match(/responsavel\s+(\S+)/i);
  return { row, message, client: clientMatch?.[1], responsible: responsibleMatch?.[1] };
}

type CategoryKey = 'client_not_found' | 'responsible_not_found' | 'insertion_error' | 'other';

const categoryGuides: Record<CategoryKey, { label: string; icon: any; colorClass: string; bgClass: string; borderClass: string; whatHappened: string; howToFix: string[]; actionLabel?: string; actionPath?: string }> = {
  client_not_found: { label: 'Processo novo — cliente não identificado', icon: UserX, colorClass: 'text-yellow-600', bgClass: 'bg-yellow-50 dark:bg-yellow-950/30', borderClass: 'border-yellow-300 dark:border-yellow-800', whatHappened: 'O sistema não conseguiu vincular a nenhum cliente cadastrado.', howToFix: ['Verifique o nome do cliente na planilha', 'Se o cliente não existe, cadastre-o'], actionLabel: 'Cadastrar Cliente', actionPath: '/clientes' },
  responsible_not_found: { label: 'Responsável não encontrado', icon: UserSearch, colorClass: 'text-blue-600', bgClass: 'bg-blue-50 dark:bg-blue-950/30', borderClass: 'border-blue-300 dark:border-blue-800', whatHappened: 'A sigla do responsável não corresponde a nenhum usuário ativo.', howToFix: ['Verifique a sigla na planilha', 'Confirme que o usuário está ativo'], actionLabel: 'Ver Usuários', actionPath: '/usuarios' },
  insertion_error: { label: 'Erro de inserção', icon: AlertCircle, colorClass: 'text-destructive', bgClass: 'bg-destructive/5', borderClass: 'border-destructive/30', whatHappened: 'Erro técnico ao inserir dados.', howToFix: ['Verifique campos obrigatórios', 'Confirme formato de datas'] },
  other: { label: 'Outros', icon: HelpCircle, colorClass: 'text-muted-foreground', bgClass: 'bg-muted/50', borderClass: 'border-border', whatHappened: 'Erros não categorizados.', howToFix: ['Verifique os dados na planilha'] },
};

function categorizeErrors(errors: string[]): Record<CategoryKey, string[]> {
  const cats: Record<CategoryKey, string[]> = { client_not_found: [], responsible_not_found: [], insertion_error: [], other: [] };
  for (const err of errors) {
    if ((err.includes('nao encontrado') && err.includes('processo')) || (err.includes('nao resolvido') && err.includes('cliente'))) cats.client_not_found.push(err);
    else if (err.includes('responsavel') && err.includes('nao encontrado')) cats.responsible_not_found.push(err);
    else if (err.includes('criar prazo') || err.includes('criar processo') || err.includes('timesheet')) cats.insertion_error.push(err);
    else cats.other.push(err);
  }
  return Object.fromEntries(Object.entries(cats).filter(([, v]) => v.length > 0)) as Record<CategoryKey, string[]>;
}

function CategorySection({ categoryKey, errors, onClose, defaultExpanded = false }: { categoryKey: CategoryKey; errors: string[]; onClose: () => void; defaultExpanded?: boolean }) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const guide = categoryGuides[categoryKey];
  const navigate = useNavigate();
  const Icon = guide.icon;
  return (
    <div className={`rounded-lg border ${guide.borderClass} ${guide.bgClass} overflow-hidden`}>
      <div className="p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2"><Icon className={`h-4 w-4 ${guide.colorClass}`} /><span className="font-medium text-sm">{guide.label}</span><Badge variant="outline" className="text-xs">{errors.length}</Badge></div>
          {guide.actionLabel && guide.actionPath && <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => { onClose(); navigate(guide.actionPath!); }}>{guide.actionLabel}<ExternalLink className="h-3 w-3" /></Button>}
        </div>
        <div className="mt-2 space-y-2 text-xs"><div><p className="font-medium text-foreground mb-0.5">O que aconteceu:</p><p className="text-muted-foreground">{guide.whatHappened}</p></div><div><p className="font-medium text-foreground mb-0.5">Como corrigir:</p><ol className="list-decimal list-inside space-y-0.5 text-muted-foreground">{guide.howToFix.map((step, i) => <li key={i}>{step}</li>)}</ol></div></div>
      </div>
      <Collapsible open={expanded} onOpenChange={setExpanded}>
        <CollapsibleTrigger className="w-full border-t px-3 py-2 flex items-center gap-1 text-xs text-muted-foreground hover:bg-accent/50 transition-colors">{expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}<span>Ver {errors.length} ocorrência{errors.length > 1 ? 's' : ''}</span></CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-3 pb-3 space-y-1">
            {errors.map((err, idx) => { const parsed = parseErrorLine(err); return (
              <div key={idx} className="flex items-center gap-2 text-xs py-1.5 px-2 rounded bg-background/80 border">
                {parsed.row && <span className="text-muted-foreground tabular-nums tracking-wide shrink-0">{parsed.row}</span>}
                <span className="text-foreground flex-1">{parsed.message}{parsed.client && <Badge variant="outline" className="ml-1 text-[10px] py-0 px-1">{parsed.client}</Badge>}{parsed.responsible && <Badge variant="outline" className="ml-1 text-[10px] py-0 px-1">{parsed.responsible}</Badge>}</span>
                {categoryKey === 'client_not_found' && parsed.client && <LinkClientPopover aliasName={parsed.client} />}
                {categoryKey === 'responsible_not_found' && parsed.responsible && <LinkUserPopover aliasName={parsed.responsible} />}
              </div>
            ); })}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

function SyncLogCard({ log, onClose }: { log: SyncLog; onClose: () => void }) {
  const allErrors = log.details?.errors || [];
  const errors = allErrors.filter((e: string) => !isDuplicateError(e));
  const hasErrors = errors.length > 0 || log.error_message;
  const [open, setOpen] = useState(!!hasErrors);
  const categories = categorizeErrors(errors);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="w-full text-left">
        <div className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="h-4 w-4 text-muted-foreground shrink-0" />
            <div>
              <div className="flex items-center gap-2"><span className="font-medium text-sm capitalize">{log.sheet_type}</span><StatusBadge status={hasErrors ? log.status : (log.status === 'error' ? 'success' : log.status)} /></div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5"><span>{log.finished_at ? format(new Date(log.finished_at), "dd/MM/yyyy HH:mm", { locale: ptBR }) : 'Em andamento'}</span>{log.finished_at && <span className="text-muted-foreground/70">({formatDistanceToNow(new Date(log.finished_at), { addSuffix: true, locale: ptBR })})</span>}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs">{log.rows_processed > 0 && <span className="flex items-center gap-1 text-green-600"><CheckCircle2 className="h-3 w-3" /> {log.rows_processed}</span>}{errors.length > 0 && <span className="flex items-center gap-1 text-destructive"><XCircle className="h-3 w-3" /> {errors.length}</span>}</div>
            {hasErrors && (open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />)}
          </div>
        </div>
      </CollapsibleTrigger>
      {hasErrors && <CollapsibleContent><div className="ml-4 mt-1 space-y-2 pl-3 py-2">{log.error_message && <div className="bg-destructive/10 text-destructive text-xs rounded p-2"><strong>Erro geral:</strong> {log.error_message}</div>}{(Object.entries(categories) as [CategoryKey, string[]][]).map(([key, catErrors], idx) => <CategorySection key={key} categoryKey={key} errors={catErrors} onClose={onClose} defaultExpanded={idx === 0} />)}</div></CollapsibleContent>}
    </Collapsible>
  );
}

interface SyncErrorsDialogProps { open: boolean; onOpenChange: (open: boolean) => void; }

export function SyncErrorsDialog({ open, onOpenChange }: SyncErrorsDialogProps) {
  const { data: history, isLoading } = useSyncHistory();
  const logsWithRealErrors = history?.filter((l: any) => { const errors = l.details?.errors || []; return errors.filter((e: string) => !isDuplicateError(e)).length > 0 || l.error_message; }) || [];
  const allLogs = history || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-yellow-500" />Histórico de Sincronização</DialogTitle><DialogDescription>Veja o status das sincronizações e aprenda como corrigir problemas.</DialogDescription></DialogHeader>
        <ScrollArea className="max-h-[55vh] pr-2">
          <div className="space-y-3">
            {isLoading ? <p className="text-sm text-muted-foreground py-4 text-center">Carregando...</p> : allLogs.length === 0 ? <p className="text-sm text-muted-foreground py-4 text-center">Nenhum registro encontrado.</p> : (
              <div className="space-y-2">
                {logsWithRealErrors.length === 0 && <div className="flex items-center gap-2 py-4 justify-center text-sm text-green-600"><CheckCircle2 className="h-4 w-4" />Nenhum erro nas últimas sincronizações</div>}
                {allLogs.map((log: any) => <SyncLogCard key={log.id} log={log} onClose={() => onOpenChange(false)} />)}
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}