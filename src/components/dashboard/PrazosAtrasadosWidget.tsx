import { useState, useMemo } from 'react';
import { AlertTriangle, ExternalLink, Clock, User, ChevronDown, ChevronUp, CheckCircle, XCircle, EyeOff, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useOverdueDeadlines, type OverdueDeadline } from '@/hooks/useOverdueDeadlines';
import { useProcessById } from '@/hooks/useProcesses';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ProcessDetailsDialog } from '@/components/processes/ProcessDetailsDialog';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface GroupedDeadline {
  process_id: string; numero_processo: string; numero_pasta: number; reclamante_nome: string;
  area: string; deadlines: OverdueDeadline[]; max_dias_atraso: number;
  atividades_count: number; ultima_atividade: string | null; tem_atividade: boolean;
}

export function PrazosAtrasadosWidget() {
  const navigate = useNavigate();
  const { can } = useAuth();
  const { data: deadlines, isLoading } = useOverdueDeadlines();
  const [selectedProcessId, setSelectedProcessId] = useState<string | null>(null);
  const { data: selectedProcess } = useProcessById(selectedProcessId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [hideWithActivity, setHideWithActivity] = useState(true);
  const showResponsavel = can('solicitacoes', 'visualizar');
  const showArea = can('relatorios', 'visualizar');

  const grouped = useMemo(() => {
    if (!deadlines) return [];
    const map = new Map<string, GroupedDeadline>();
    for (const d of deadlines) {
      const existing = map.get(d.process_id);
      if (existing) { existing.deadlines.push(d); existing.max_dias_atraso = Math.max(existing.max_dias_atraso, d.dias_atraso); existing.atividades_count = Math.max(existing.atividades_count, d.atividades_count); if (d.ultima_atividade && (!existing.ultima_atividade || d.ultima_atividade > existing.ultima_atividade)) existing.ultima_atividade = d.ultima_atividade; existing.tem_atividade = existing.tem_atividade || d.tem_atividade; }
      else map.set(d.process_id, { process_id: d.process_id, numero_processo: d.numero_processo, numero_pasta: d.numero_pasta, reclamante_nome: d.reclamante_nome, area: d.area, deadlines: [d], max_dias_atraso: d.dias_atraso, atividades_count: d.atividades_count, ultima_atividade: d.ultima_atividade, tem_atividade: d.tem_atividade });
    }
    return Array.from(map.values()).sort((a, b) => b.max_dias_atraso - a.max_dias_atraso);
  }, [deadlines]);

  const filteredGrouped = useMemo(() => hideWithActivity ? grouped.filter(g => !g.tem_atividade) : grouped, [grouped, hideWithActivity]);
  const hiddenCount = grouped.length - filteredGrouped.length;

  const handleGroupClick = (group: GroupedDeadline) => { setSelectedProcessId(group.process_id); setDialogOpen(true); };
  const toggleExpand = (processId: string, e: React.MouseEvent) => { e.stopPropagation(); setExpandedGroups(prev => { const next = new Set(prev); if (next.has(processId)) next.delete(processId); else next.add(processId); return next; }); };

  if (isLoading) return <Card className="border-destructive/50 bg-destructive/5"><CardHeader className="pb-3"><Skeleton className="h-6 w-48" /></CardHeader><CardContent><div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div></CardContent></Card>;
  if (!deadlines || deadlines.length === 0) return null;

  const formatDaysOverdue = (days: number) => days === 1 ? '1 dia' : `${days} dias`;

  return (
    <>
      <Card className="border-destructive/50 bg-destructive/5 dark:bg-destructive/10">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-destructive"><AlertTriangle className="h-5 w-5 animate-pulse" />Prazos Atrasados</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="destructive" className="text-sm px-3 py-1">{filteredGrouped.length}{hiddenCount > 0 && <span className="ml-1 opacity-70">({deadlines.length})</span>}</Badge>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setHideWithActivity(!hideWithActivity)}>{hideWithActivity ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <TooltipProvider>
            {filteredGrouped.map((group) => {
              const isExpanded = expandedGroups.has(group.process_id);
              const hasMultiple = group.deadlines.length > 1;
              return (
                <div key={group.process_id}>
                  <div className="p-3 rounded-lg bg-background border border-destructive/20 hover:bg-destructive/5 transition-colors cursor-pointer" onClick={() => handleGroupClick(group)}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm">Pasta {group.numero_pasta}</span>
                          <span className="text-xs text-muted-foreground truncate max-w-[200px]">{group.numero_processo}</span>
                          {showArea && <Badge variant="outline" className="text-xs">{group.area}</Badge>}
                          <ActivityIndicator temAtividade={group.tem_atividade} count={group.atividades_count} ultimaAtividade={group.ultima_atividade} />
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{group.reclamante_nome}</p>
                        {!hasMultiple && <div className="flex items-center gap-1 text-sm"><Clock className="h-3 w-3 text-muted-foreground" /><span className="truncate">{group.deadlines[0].ocorrencia}</span></div>}
                        {!hasMultiple && showResponsavel && group.deadlines[0].assigned_user_name && <div className="flex items-center gap-1 text-xs text-muted-foreground"><User className="h-3 w-3" /><span>{group.deadlines[0].assigned_user_name}</span></div>}
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <Badge variant="destructive">{formatDaysOverdue(group.max_dias_atraso)} atrasado</Badge>
                        {hasMultiple && <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-muted-foreground" onClick={(e) => toggleExpand(group.process_id, e)}>{group.deadlines.length} prazos{isExpanded ? <ChevronUp className="ml-1 h-3 w-3" /> : <ChevronDown className="ml-1 h-3 w-3" />}</Button>}
                      </div>
                    </div>
                  </div>
                  {hasMultiple && isExpanded && (
                    <div className="ml-4 mt-1 space-y-1">
                      {group.deadlines.map((d) => (
                        <div key={d.id} className="p-2 rounded bg-muted/50 text-sm flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0"><Clock className="h-3 w-3 text-muted-foreground shrink-0" /><span className="truncate">{d.ocorrencia}</span>{showResponsavel && d.assigned_user_name && <span className="text-xs text-muted-foreground">• {d.assigned_user_name}</span>}</div>
                          <Badge variant="outline" className="text-xs shrink-0">{formatDaysOverdue(d.dias_atraso)}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </TooltipProvider>
          <Button variant="outline" className="w-full mt-4 border-destructive/30 text-destructive hover:bg-destructive/10" onClick={() => navigate('/solicitacoes')}>Ver todos os prazos<ExternalLink className="ml-2 h-4 w-4" /></Button>
        </CardContent>
      </Card>
      <ProcessDetailsDialog open={dialogOpen} onOpenChange={setDialogOpen} process={selectedProcess ?? null} onEdit={() => {}} defaultTab="deadlines" />
    </>
  );
}

function ActivityIndicator({ temAtividade, count, ultimaAtividade }: { temAtividade: boolean; count: number; ultimaAtividade: string | null }) {
  const tooltipText = temAtividade
    ? `${count} atividade${count > 1 ? 's' : ''} registrada${count > 1 ? 's' : ''} no timesheet${ultimaAtividade ? ` (última: ${format(parseISO(ultimaAtividade), 'dd/MM', { locale: ptBR })})` : ''}`
    : 'Sem atividades registradas no timesheet';
  return (
    <Tooltip><TooltipTrigger asChild>
      <span className="inline-flex items-center gap-1 cursor-help">
        {temAtividade ? <CheckCircle className="h-3.5 w-3.5 text-emerald-500" /> : <XCircle className="h-3.5 w-3.5 text-destructive" />}
        <span className={`text-xs ${temAtividade ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}>{temAtividade ? `${count} ativ.` : 'Sem ativ.'}</span>
      </span>
    </TooltipTrigger><TooltipContent side="top" className="max-w-[280px]"><p className="text-xs">{tooltipText}</p></TooltipContent></Tooltip>
  );
}