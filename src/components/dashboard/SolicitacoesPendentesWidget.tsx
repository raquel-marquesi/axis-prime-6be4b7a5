import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Inbox, Mail, Globe, Pencil, ArrowRight, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useSolicitacoes } from '@/hooks/useSolicitacoes';

const PRIORIDADE_LABELS: Record<string, string> = { baixa: 'Baixa', media: 'Média', alta: 'Alta', urgente: 'Urgente' };
import { cn } from '@/lib/utils';

const origemIcons: Record<string, any> = { email: Mail, api: Globe, manual: Pencil };
const prioridadeColors: Record<string, string> = { baixa: 'bg-slate-500', media: 'bg-blue-500', alta: 'bg-orange-500', urgente: 'bg-red-500' };

export function SolicitacoesPendentesWidget() {
  const { solicitacoes, pendingCount, isLoading } = useSolicitacoes({ status: 'pendente' });
  const priorityOrder: Record<string, number> = { urgente: 0, alta: 1, media: 2, baixa: 3 };
  const topSolicitacoes = [...solicitacoes].sort((a: any, b: any) => (priorityOrder[a.prioridade] ?? 3) - (priorityOrder[b.prioridade] ?? 3)).slice(0, 5);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div><CardTitle className="flex items-center gap-2"><Inbox className="h-5 w-5 text-purple-500" />Prazos Pendentes</CardTitle><CardDescription>Tarefas aguardando atenção</CardDescription></div>
        {pendingCount > 0 && <Badge variant="secondary" className="text-lg font-bold">{pendingCount}</Badge>}
      </CardHeader>
      <CardContent>
        {isLoading ? <div className="flex items-center justify-center py-4"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div> : topSolicitacoes.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground"><AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" /><p className="text-sm">Nenhuma solicitação pendente</p></div>
        ) : (
          <div className="space-y-3">
            {topSolicitacoes.map((solicitacao: any) => {
              const OrigemIcon = origemIcons[solicitacao.origem] || Pencil;
              const isOverdue = solicitacao.data_limite && new Date(solicitacao.data_limite) < new Date();
              return (
                <div key={solicitacao.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors">
                  <div className="p-1.5 rounded bg-muted"><OrigemIcon className="h-4 w-4 text-muted-foreground" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2"><p className="text-sm font-medium truncate">{solicitacao.titulo}</p><Badge className={cn('text-xs text-white shrink-0', prioridadeColors[solicitacao.prioridade])}>{PRIORIDADE_LABELS[solicitacao.prioridade]}</Badge></div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {solicitacao.client && <span className="text-xs text-muted-foreground truncate">{solicitacao.client.razao_social || solicitacao.client.nome}</span>}
                      {solicitacao.data_limite && <span className={cn('text-xs', isOverdue ? 'text-red-500' : 'text-muted-foreground')}>• Prazo: {format(new Date(solicitacao.data_limite), 'dd/MM', { locale: ptBR })}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
            <Button variant="ghost" className="w-full mt-2" asChild><Link to="/solicitacoes" className="flex items-center justify-center gap-2">Ver todos os prazos<ArrowRight className="h-4 w-4" /></Link></Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}