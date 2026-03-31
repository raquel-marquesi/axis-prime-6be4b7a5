import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Plus, Trash2, Eye, ChevronsUpDown, Check, Clock, CheckCircle2, User, CalendarCheck, AlertTriangle, ExternalLink, LinkIcon } from 'lucide-react';
import { useProcessDeadlines, ProcessDeadline } from '@/hooks/useProcessDeadlines';
import { useDeadlineWithCalendar, ProcessInfo } from '@/hooks/useDeadlineWithCalendar';
import { useProfiles } from '@/hooks/useProfiles';
import { useAuth } from '@/contexts/AuthContext';
import { format, isFuture, isToday, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { DeadlineCompletionDialog } from './DeadlineCompletionDialog';

const OCORRENCIA_OPTIONS = [
  'Análise de Documento', 'Análise Processual - Decisões', 'Cálculo Cível Execução/Impugnação',
  'Cálculo Correção dos Cálculos', 'Cálculo de Ação Coletiva', 'Cálculo de Atualização de Inicial',
  'Cálculo de Atualização de Sentença', 'Cálculo de Embargos a Execução', 'Cálculo de Liquidação Execução/Impugnação',
  'Cálculo de Provisão de Acordão', 'Cálculo de Provisão Sentença', 'Cálculo Preliminar Inicial',
  'Digitação cartão de ponto', 'Digitação Evolução Salarial',
];

interface DeadlinesTabProps {
  processId: string;
  processInfo?: ProcessInfo;
  driveFolderUrl?: string;
}

export function DeadlinesTab({ processId, processInfo, driveFolderUrl }: DeadlinesTabProps) {
  const { isLeaderOrAbove } = useAuth();
  const { profiles, getInitials, getName } = useProfiles();
  const { deadlines } = useProcessDeadlines(processId);
  const { createDeadlineWithCalendar, deleteDeadlineWithCalendar } = useDeadlineWithCalendar(processInfo);
  
  const [newDeadlineData, setNewDeadlineData] = useState('');
  const [newDeadlineOcorrencia, setNewDeadlineOcorrencia] = useState('');
  const [newDeadlineDetalhes, setNewDeadlineDetalhes] = useState('');
  const [newDeadlineAssignedTo, setNewDeadlineAssignedTo] = useState<string>('');
  const [selectedDeadline, setSelectedDeadline] = useState<{ ocorrencia: string; detalhes: string | null } | null>(null);
  const [deleteDeadlineData, setDeleteDeadlineData] = useState<{ id: string; calendar_event_id?: string | null } | null>(null);
  const [completionDeadline, setCompletionDeadline] = useState<ProcessDeadline | null>(null);
  const [ocorrenciaOpen, setOcorrenciaOpen] = useState(false);

  const formatShortDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    try { return format(new Date(dateStr), 'dd/MM/yyyy', { locale: ptBR }); } catch { return dateStr; }
  };

  const getDeadlineStatus = (deadline: ProcessDeadline) => {
    if (deadline.is_completed) return { label: 'Concluído', color: 'bg-green-100 text-green-700', icon: CheckCircle2 };
    try {
      const date = parseISO(deadline.data_prazo);
      if (isToday(date)) return { label: 'Hoje', color: 'bg-yellow-100 text-yellow-700', icon: Clock };
      if (isFuture(date)) return { label: 'Futuro', color: 'bg-blue-100 text-blue-700', icon: Clock };
      return { label: 'Atrasado', color: 'bg-red-100 text-red-700', icon: AlertTriangle };
    } catch { return { label: 'Atrasado', color: 'bg-red-100 text-red-700', icon: AlertTriangle }; }
  };

  const handleAddDeadline = async () => {
    if (!newDeadlineData || !newDeadlineOcorrencia.trim()) return;
    await createDeadlineWithCalendar.mutateAsync({
      process_id: processId, data_prazo: newDeadlineData, ocorrencia: newDeadlineOcorrencia.trim(),
      detalhes: newDeadlineDetalhes.trim() || undefined, assigned_to: newDeadlineAssignedTo || undefined,
    });
    setNewDeadlineData(''); setNewDeadlineOcorrencia(''); setNewDeadlineDetalhes(''); setNewDeadlineAssignedTo('');
  };

  const handleConfirmDeleteDeadline = async () => {
    if (deleteDeadlineData) { await deleteDeadlineWithCalendar.mutateAsync(deleteDeadlineData); setDeleteDeadlineData(null); }
  };

  const filteredOptions = OCORRENCIA_OPTIONS.filter((o) => o.toLowerCase().includes(newDeadlineOcorrencia.toLowerCase()));

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div className="text-sm text-muted-foreground mb-4">Histórico de prazos e ocorrências realizadas neste processo.</div>
        {deadlines.length > 0 ? (
          <div className="space-y-2">
            {deadlines.map((deadline) => {
              const status = getDeadlineStatus(deadline);
              const StatusIcon = status.icon;
              const assignedToName = getName(deadline.assigned_to);
              return (
                <div key={deadline.id} className="flex items-center justify-between bg-muted/50 rounded px-3 py-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs tabular-nums tracking-wide bg-background px-2 py-0.5 rounded">{formatShortDate(deadline.data_prazo)}</span>
                      <span className={cn("inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full", status.color)}>
                        <StatusIcon className="w-3 h-3" />{status.label}
                      </span>
                      <span className="text-sm font-medium truncate">{deadline.ocorrencia}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {deadline.document_url && (
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => window.open(deadline.document_url!, '_blank')}>
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                    )}
                    {deadline.calendar_event_id && (
                      <Tooltip><TooltipTrigger asChild>
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-green-100 text-green-700 cursor-help"><CalendarCheck className="w-3 h-3" /></span>
                      </TooltipTrigger><TooltipContent><p>Sincronizado com Google Calendar</p></TooltipContent></Tooltip>
                     )}
                    {deadline.solicitacao_id && deadline.solicitacao && (
                      <Tooltip><TooltipTrigger asChild>
                        <span className="inline-flex h-5 items-center gap-1 px-1.5 rounded bg-accent text-accent-foreground text-[10px] font-medium cursor-help">
                          <LinkIcon className="w-3 h-3" />Solicitação
                        </span>
                      </TooltipTrigger><TooltipContent><p>Origem: {deadline.solicitacao.titulo} ({deadline.solicitacao.prioridade})</p></TooltipContent></Tooltip>
                    )}
                    {deadline.assigned_to && (
                      <Tooltip><TooltipTrigger asChild>
                        <span className="inline-flex h-5 items-center gap-1 px-1.5 rounded bg-primary/10 text-primary text-[10px] font-medium cursor-help">
                          <User className="w-3 h-3" />{getInitials(deadline.assigned_to)}
                        </span>
                      </TooltipTrigger><TooltipContent><p>Atribuído a: {assignedToName}</p></TooltipContent></Tooltip>
                    )}
                    {deadline.detalhes && (
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSelectedDeadline({ ocorrencia: deadline.ocorrencia, detalhes: deadline.detalhes })}>
                        <Eye className="w-3 h-3" />
                      </Button>
                    )}
                    {!deadline.is_completed && (
                      <Button variant="outline" size="sm" className="h-6 text-xs" onClick={() => setCompletionDeadline(deadline)}>
                        <CheckCircle2 className="w-3 h-3 mr-1" />Concluir
                      </Button>
                    )}
                    {isLeaderOrAbove() && (
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive"
                        onClick={() => setDeleteDeadlineData({ id: deadline.id, calendar_event_id: deadline.calendar_event_id })}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : <div className="text-center py-8 text-muted-foreground text-sm">Nenhum prazo ou ocorrência registrada.</div>}

        {isLeaderOrAbove() && (
          <div className="border-t pt-4 space-y-3">
            <Label className="text-sm font-medium">Adicionar Prazo / Ocorrência</Label>
            <div className="grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <Input type="date" value={newDeadlineData} onChange={(e) => setNewDeadlineData(e.target.value)} />
                <Popover open={ocorrenciaOpen} onOpenChange={setOcorrenciaOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" className="justify-between font-normal">
                      <span className={cn("truncate", !newDeadlineOcorrencia && "text-muted-foreground")}>{newDeadlineOcorrencia || "Selecione ou digite..."}</span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[350px] p-0" align="start">
                    <Command shouldFilter={false}>
                      <CommandInput placeholder="Buscar ou digitar ocorrência..." value={newDeadlineOcorrencia} onValueChange={setNewDeadlineOcorrencia} />
                      <CommandList>
                        <CommandEmpty><div className="py-2 px-3 text-sm">Use: <span className="font-medium">{newDeadlineOcorrencia}</span></div></CommandEmpty>
                        <CommandGroup>
                          {filteredOptions.map((option) => (
                            <CommandItem key={option} value={option} onSelect={(v) => { setNewDeadlineOcorrencia(v); setOcorrenciaOpen(false); }}>
                              <Check className={cn("mr-2 h-4 w-4", newDeadlineOcorrencia === option ? "opacity-100" : "opacity-0")} />{option}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <Select value={newDeadlineAssignedTo} onValueChange={setNewDeadlineAssignedTo}>
                <SelectTrigger><SelectValue placeholder="Atribuir a usuário (opcional)" /></SelectTrigger>
                <SelectContent>{profiles.map((p) => <SelectItem key={p.user_id} value={p.user_id}>{p.full_name}</SelectItem>)}</SelectContent>
              </Select>
              <Textarea placeholder="Detalhes (opcional)" value={newDeadlineDetalhes} onChange={(e) => setNewDeadlineDetalhes(e.target.value)} rows={2} />
              <Button onClick={handleAddDeadline} disabled={!newDeadlineData || !newDeadlineOcorrencia.trim() || createDeadlineWithCalendar.isPending} size="sm">
                <Plus className="w-4 h-4 mr-1" />{createDeadlineWithCalendar.isPending ? 'Salvando...' : 'Adicionar'}
              </Button>
            </div>
          </div>
        )}
      </div>

      <Dialog open={!!selectedDeadline} onOpenChange={() => setSelectedDeadline(null)}>
        <DialogContent><DialogHeader><DialogTitle>{selectedDeadline?.ocorrencia}</DialogTitle></DialogHeader>
          <div className="text-sm whitespace-pre-wrap">{selectedDeadline?.detalhes || 'Sem detalhes.'}</div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteDeadlineData} onOpenChange={() => setDeleteDeadlineData(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Remover prazo/ocorrência?</AlertDialogTitle>
          <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleConfirmDeleteDeadline}>Remover</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DeadlineCompletionDialog open={!!completionDeadline} onOpenChange={(open) => !open && setCompletionDeadline(null)}
        deadline={completionDeadline} processId={processId} reclamante_nome={processInfo?.reclamante_nome} drive_folder_url={driveFolderUrl} />
    </TooltipProvider>
  );
}
