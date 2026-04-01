import { useState, useMemo } from 'react';
import { Filter, Calendar, CheckCircle2, Clock, AlertTriangle, Search, List, CheckCircle, XCircle, EyeOff, Bot, LinkIcon } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { DeadlinesCalendarView } from './DeadlinesCalendarView';
import { useAllProcessDeadlines, useDeadlineCounts, type DeadlineStatus, type ProcessDeadlineRow } from '@/hooks/useAllProcessDeadlines';
import { useOverdueTimesheetMap } from '@/hooks/useOverdueTimesheetMap';
import { type Process } from '@/hooks/useProcesses';
import { ProcessDetailsDialog } from '@/components/processes/ProcessDetailsDialog';
import { useAuth } from '@/contexts/AuthContext';
import { useProfiles } from '@/hooks/useProfiles';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AIAgentChat } from '@/components/ai/AIAgentChat';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

const STATUS_CONFIG: Record<DeadlineStatus, { label: string; variant: 'destructive' | 'default' | 'secondary' | 'outline'; icon: typeof AlertTriangle }> = {
  atrasado: { label: 'Atrasado', variant: 'destructive', icon: AlertTriangle },
  hoje: { label: 'Hoje', variant: 'default', icon: Clock },
  futuro: { label: 'Futuro', variant: 'secondary', icon: Calendar },
  concluido: { label: 'Concluído', variant: 'outline', icon: CheckCircle2 },
};

export function PrazosProcessuaisTab() {
  const { isCoordinatorOrAbove, isAdminOrManager, isFinanceiro } = useAuth();
  const [statusFilter, setStatusFilter] = useState<DeadlineStatus | 'all'>('all');
  const [viewMode, setViewMode] = useState<'table' | 'calendar'>('table');
  const [cardFilter, setCardFilter] = useState<DeadlineStatus | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [userFilter, setUserFilter] = useState<string>('all');
  const [teamFilter, setTeamFilter] = useState<string>('all');
  const [selectedProcess, setSelectedProcess] = useState<Process | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [hideWithActivity, setHideWithActivity] = useState(true);
  const [aiChatOpen, setAiChatOpen] = useState(false);

  const effectiveStatusFilter = cardFilter || (statusFilter === 'all' ? undefined : statusFilter);
  const { data: deadlines = [], isLoading } = useAllProcessDeadlines({ statusFilter: effectiveStatusFilter, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined, excludeCompleted: !cardFilter && statusFilter === 'all' });
  const { data: counts = { atrasado: 0, hoje: 0, futuro: 0, concluido: 0 } } = useDeadlineCounts();
  const { profiles } = useProfiles();
  const { toast } = useToast();
  const showResponsavel = isCoordinatorOrAbove() || isAdminOrManager() || isFinanceiro();

  const overdueProcessIds = useMemo(() => [...new Set(deadlines.filter(d => d.status === 'atrasado').map(d => d.process_id))], [deadlines]);
  const earliestOverduePrazo = useMemo(() => { const overdue = deadlines.filter(d => d.status === 'atrasado'); if (overdue.length === 0) return undefined; return overdue.reduce((min, d) => d.data_prazo < min ? d.data_prazo : min, overdue[0].data_prazo); }, [deadlines]);
  const { data: timesheetMap = {} } = useOverdueTimesheetMap(overdueProcessIds, earliestOverduePrazo);

  const { uniqueUsers, uniqueTeams } = useMemo(() => {
    const usersMap = new Map<string, string>();
    const teamsSet = new Set<string>();
    deadlines.forEach(d => { if (d.assigned_to && d.assigned_user_name) usersMap.set(d.assigned_to, d.assigned_user_name); if (d.area) teamsSet.add(d.area); });
    return { uniqueUsers: Array.from(usersMap.entries()).sort((a, b) => a[1].localeCompare(b[1])), uniqueTeams: Array.from(teamsSet).sort() };
  }, [deadlines]);

  const filteredDeadlines = useMemo(() => {
    let result = deadlines;
    if (hideWithActivity) result = result.filter(d => d.status !== 'atrasado' || !timesheetMap[d.process_id]);
    if (searchTerm.trim()) { const term = searchTerm.toLowerCase(); result = result.filter(d => d.numero_processo.toLowerCase().includes(term) || d.reclamante_nome.toLowerCase().includes(term) || (d.reclamadas?.[0] || '').toLowerCase().includes(term) || d.ocorrencia.toLowerCase().includes(term)); }
    if (userFilter !== 'all') result = result.filter(d => d.assigned_to === userFilter);
    if (teamFilter !== 'all') result = result.filter(d => d.area === teamFilter);
    return result;
  }, [deadlines, searchTerm, userFilter, teamFilter, hideWithActivity, timesheetMap]);

  const handleRowClick = async (row: ProcessDeadlineRow) => {
    const { data, error } = await supabase.from('processes').select('*').eq('id', row.process_id).maybeSingle();
    if (data) { setSelectedProcess(data as unknown as Process); setDialogOpen(true); } else { toast({ title: 'Processo não encontrado', variant: 'destructive' }); }
  };

  return (
    <>
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          {(['atrasado', 'hoje', 'futuro'] as const).map(status => (
            <Card key={status} className={`cursor-pointer transition-all ${cardFilter === status ? `ring-2 ring-${status === 'atrasado' ? 'destructive' : status === 'hoje' ? 'yellow-500' : 'blue-500'}` : 'hover:bg-muted/50'}`} onClick={() => setCardFilter(cardFilter === status ? null : status)}>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{STATUS_CONFIG[status].label}</CardTitle></CardHeader>
              <CardContent><div className={`text-2xl font-bold ${status === 'atrasado' ? 'text-destructive' : status === 'hoje' ? 'text-yellow-600' : 'text-blue-600'}`}>{counts[status]}</div></CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2"><Filter className="h-5 w-5" />Filtros</CardTitle>
            <div className="flex gap-1">
              <Button variant={viewMode === 'table' ? 'default' : 'outline'} size="icon" className="h-8 w-8" onClick={() => setViewMode('table')}><List className="h-4 w-4" /></Button>
              <Button variant={viewMode === 'calendar' ? 'default' : 'outline'} size="icon" className="h-8 w-8" onClick={() => setViewMode('calendar')}><Calendar className="h-4 w-4" /></Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <div className="relative w-64"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Buscar processo, parte, ocorrência..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" /></div>
              <div className="w-48"><Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as DeadlineStatus | 'all')}><SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">Todos (exceto concluídos)</SelectItem><SelectItem value="atrasado">Atrasado</SelectItem><SelectItem value="hoje">Hoje</SelectItem><SelectItem value="futuro">Futuro</SelectItem></SelectContent></Select></div>
              {showResponsavel && <div className="w-48"><Select value={userFilter} onValueChange={setUserFilter}><SelectTrigger><SelectValue placeholder="Responsável" /></SelectTrigger><SelectContent><SelectItem value="all">Todos os responsáveis</SelectItem>{uniqueUsers.map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}</SelectContent></Select></div>}
              <div className="w-48"><Select value={teamFilter} onValueChange={setTeamFilter}><SelectTrigger><SelectValue placeholder="Equipe / Área" /></SelectTrigger><SelectContent><SelectItem value="all">Todas as equipes</SelectItem>{uniqueTeams.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
              <div className="flex items-center gap-2"><Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" /><span className="text-muted-foreground">até</span><Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" /></div>
              <Button variant={hideWithActivity ? 'default' : 'outline'} size="sm" className="gap-1.5" onClick={() => setHideWithActivity(!hideWithActivity)}><EyeOff className="h-3.5 w-3.5" />Ocultar cumpridos</Button>
            </div>
          </CardContent>
        </Card>

        {viewMode === 'calendar' ? (
          <Card><CardContent className="pt-6">{isLoading ? <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-24 w-full" />)}</div> : <DeadlinesCalendarView deadlines={filteredDeadlines} onDeadlineClick={handleRowClick} />}</CardContent></Card>
        ) : (
          <Card>
            <CardHeader><CardTitle>Prazos Processuais</CardTitle><CardDescription>Prazos vinculados a processos do sistema</CardDescription></CardHeader>
            <CardContent>
              {isLoading ? <div className="space-y-3">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div> : filteredDeadlines.length === 0 ? <p className="text-center text-muted-foreground py-8">Nenhum prazo processual encontrado.</p> : (
                 <Table>
                  <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Status</TableHead><TableHead>Processo</TableHead><TableHead>Reclamante</TableHead><TableHead>Reclamada</TableHead><TableHead>Ocorrência</TableHead><TableHead>Origem</TableHead>{showResponsavel && <TableHead>Responsável</TableHead>}<TableHead>Atividades</TableHead><TableHead>Solicitante</TableHead><TableHead className="max-w-[150px]">Últ. Andamento</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {filteredDeadlines.map((d) => {
                      const cfg = STATUS_CONFIG[d.status]; const Icon = cfg.icon;
                      return (
                        <TableRow key={d.id} className="cursor-pointer" onClick={() => handleRowClick(d)}>
                          <TableCell className="whitespace-nowrap">{format(parseISO(d.data_prazo), 'dd/MM/yyyy', { locale: ptBR })}</TableCell>
                          <TableCell><Badge variant={cfg.variant} className="gap-1"><Icon className="h-3 w-3" />{cfg.label}{d.status === 'atrasado' && d.dias_atraso > 0 && ` (${d.dias_atraso}d)`}</Badge></TableCell>
                          <TableCell><span className="font-medium text-sm truncate max-w-[200px]">{d.numero_processo}</span></TableCell>
                          <TableCell className="max-w-[180px] truncate">{d.reclamante_nome}</TableCell>
                          <TableCell className="max-w-[180px] truncate">{d.reclamadas?.[0] || '—'}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{d.ocorrencia}</TableCell>
                          <TableCell>{d.solicitacao_id ? <Tooltip><TooltipTrigger asChild><span className="inline-flex items-center gap-1 text-xs"><LinkIcon className="h-3 w-3 text-primary" /><span className="text-primary truncate max-w-[100px]"><TableCell>{d.solicitacao_id ? <Tooltip><TooltipTrigger asChild><span className="inline-flex items-center gap-1 text-xs"><LinkIcon className="h-3 w-3 text-primary" /><span className="text-primary truncate max-w-[100px]">{d.solicitacao_titulo || 'Prazo'}</span></span></TooltipTrigger><TooltipContent><p>Prioridade: {d.solicitacao_prioridade || '—'}</p></TooltipContent></Tooltip> : <span className="text-xs text-muted-foreground">Manual</span>}</TableCell></span></span></TooltipTrigger><TooltipContent><p>Prioridade: {d.solicitacao_prioridade || '—'}</p></TooltipContent></Tooltip> : <span className="text-xs text-muted-foreground">Manual</span>}</TableCell>
                          {showResponsavel && <TableCell className="text-muted-foreground">{d.assigned_user_name || '—'}</TableCell>}
                          <TableCell>
                            {d.status === 'atrasado' ? (
                              <Tooltip><TooltipTrigger asChild><span className="inline-flex items-center gap-1">{timesheetMap[d.process_id] ? (<><CheckCircle className="h-3.5 w-3.5 text-emerald-500" /><span className="text-xs text-emerald-600 dark:text-emerald-400">{timesheetMap[d.process_id].count} ativ.</span></>) : (<><XCircle className="h-3.5 w-3.5 text-destructive" /><span className="text-xs text-destructive">Sem ativ.</span></>)}</span></TooltipTrigger><TooltipContent side="top" className="max-w-[280px]"><p className="text-xs">{timesheetMap[d.process_id] ? `${timesheetMap[d.process_id].count} atividade(s) no timesheet` : 'Nenhuma atividade registrada'}</p></TooltipContent></Tooltip>
                            ) : <span className="text-xs text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell className="text-muted-foreground">{d.completed_by_name || '—'}</TableCell>
                          <TableCell className="max-w-[150px] truncate text-muted-foreground">{d.ultimo_andamento || '—'}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <Collapsible open={aiChatOpen} onOpenChange={setAiChatOpen}>
        <CollapsibleTrigger asChild><Button variant="outline" className="mb-4 gap-2"><Bot className="h-4 w-4" />{aiChatOpen ? 'Fechar Assistente de Prazos' : 'Assistente de Prazos (IA)'}</Button></CollapsibleTrigger>
        <CollapsibleContent><Card className="mb-4"><AIAgentChat module="prazos" className="h-[400px]" /></Card></CollapsibleContent>
      </Collapsible>

      <ProcessDetailsDialog open={dialogOpen} onOpenChange={setDialogOpen} process={selectedProcess} onEdit={() => {}} defaultTab="deadlines" />
    </>
  );
}