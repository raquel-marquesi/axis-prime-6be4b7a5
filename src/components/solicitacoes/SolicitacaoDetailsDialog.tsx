import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Mail, Globe, Pencil, Calendar, User, Building, FileText, FileSpreadsheet } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Solicitacao, PRIORIDADE_LABELS, STATUS_LABELS, ORIGEM_LABELS } from '@/hooks/useSolicitacoes';
import { cn } from '@/lib/utils';
import { AIAgentChat } from '@/components/ai/AIAgentChat';

interface SolicitacaoDetailsDialogProps { open: boolean; onOpenChange: (open: boolean) => void; solicitacao: Solicitacao | null; }

const origemIcons: Record<string, any> = { email: Mail, api: Globe, manual: Pencil, email_sheet: Mail, planilha_5_clientes: FileSpreadsheet };
const prioridadeColors: Record<string, string> = { baixa: 'bg-slate-500', media: 'bg-blue-500', alta: 'bg-orange-500', urgente: 'bg-red-500' };
const statusColors: Record<string, string> = { pendente: 'bg-yellow-500', em_andamento: 'bg-blue-500', concluida: 'bg-green-500', cancelada: 'bg-gray-500' };

export function SolicitacaoDetailsDialog({ open, onOpenChange, solicitacao }: SolicitacaoDetailsDialogProps) {
  if (!solicitacao) return null;
  const OrigemIcon = origemIcons[solicitacao.origem];
  const clientName = solicitacao.client?.razao_social || solicitacao.client?.nome;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <OrigemIcon className="h-5 w-5 text-muted-foreground" />
            <Badge className="text-xs">{ORIGEM_LABELS[solicitacao.origem]}</Badge>
          </div>
          <DialogTitle className="text-xl">{solicitacao.titulo}</DialogTitle>
          <DialogDescription>Criada em {format(new Date(solicitacao.created_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge className={cn('text-white', statusColors[solicitacao.status])}>{STATUS_LABELS[solicitacao.status]}</Badge>
            <Badge className={cn('text-white', prioridadeColors[solicitacao.prioridade])}>{PRIORIDADE_LABELS[solicitacao.prioridade]}</Badge>
          </div>
          <Separator />
          {solicitacao.descricao && (<div><h4 className="text-sm font-medium text-muted-foreground mb-1">Descrição</h4><p className="text-sm">{solicitacao.descricao}</p></div>)}
          {solicitacao.origem === 'email' && (<><Separator /><div className="space-y-2"><h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Mail className="h-4 w-4" />Dados do E-mail</h4>{solicitacao.email_from && <div className="text-sm"><span className="text-muted-foreground">De: </span>{solicitacao.email_from}</div>}{solicitacao.email_subject && <div className="text-sm"><span className="text-muted-foreground">Assunto: </span>{solicitacao.email_subject}</div>}</div></>)}
          <Separator />
          <div className="grid grid-cols-2 gap-4">
            <div><h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-1"><Building className="h-4 w-4" />Cliente</h4><p className="text-sm">{clientName || 'Não associado'}</p></div>
            <div><h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-1"><FileText className="h-4 w-4" />Processo</h4><p className="text-sm">{solicitacao.process ? `${solicitacao.process.numero_pasta} - ${solicitacao.process.reclamante_nome}` : 'Não associado'}</p></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-1"><User className="h-4 w-4" />Responsável</h4><p className="text-sm">{solicitacao.assigned_user?.full_name || 'Não atribuído'}</p></div>
            <div><h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-1"><Calendar className="h-4 w-4" />Prazo</h4><p className="text-sm">{solicitacao.data_limite ? format(new Date(solicitacao.data_limite), 'dd/MM/yyyy', { locale: ptBR }) : 'Sem prazo definido'}</p></div>
          </div>
          <Separator />
          <div className="border rounded-lg overflow-hidden"><AIAgentChat module="solicitacoes" context={{ solicitacao_id: solicitacao.id }} compact /></div>
        </div>
      </DialogContent>
    </Dialog>
  );
}