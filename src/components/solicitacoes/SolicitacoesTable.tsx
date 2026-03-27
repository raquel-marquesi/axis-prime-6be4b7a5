import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Mail, Globe, Pencil, MoreHorizontal, Eye, Trash2, CheckCircle, Clock, XCircle, FileSpreadsheet } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Solicitacao, StatusSolicitacao, PRIORIDADE_LABELS, STATUS_LABELS, ORIGEM_LABELS } from '@/hooks/useSolicitacoes';
import { cn } from '@/lib/utils';

interface SolicitacoesTableProps { solicitacoes: Solicitacao[]; onEdit: (s: Solicitacao) => void; onView: (s: Solicitacao) => void; onDelete: (id: string) => void; onStatusChange: (id: string, status: StatusSolicitacao) => void; isLoading?: boolean; }

const origemIcons: Record<string, any> = { email: Mail, api: Globe, manual: Pencil, email_sheet: Mail, planilha_5_clientes: FileSpreadsheet };
const prioridadeColors: Record<string, string> = { baixa: 'bg-slate-500', media: 'bg-blue-500', alta: 'bg-orange-500', urgente: 'bg-red-500' };
const statusColors: Record<string, string> = { pendente: 'bg-yellow-500', em_andamento: 'bg-blue-500', concluida: 'bg-green-500', cancelada: 'bg-gray-500' };

export function SolicitacoesTable({ solicitacoes, onEdit, onView, onDelete, onStatusChange, isLoading }: SolicitacoesTableProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleDeleteClick = (id: string) => { setSelectedId(id); setDeleteDialogOpen(true); };
  const handleConfirmDelete = () => { if (selectedId) onDelete(selectedId); setDeleteDialogOpen(false); setSelectedId(null); };

  if (isLoading) return <div className="flex items-center justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  if (solicitacoes.length === 0) return <div className="text-center py-8 text-muted-foreground">Nenhuma solicitação encontrada.</div>;

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader><TableRow><TableHead className="w-[100px]">Origem</TableHead><TableHead>Título</TableHead><TableHead>Cliente</TableHead><TableHead className="w-[100px]">Prioridade</TableHead><TableHead className="w-[120px]">Status</TableHead><TableHead>Responsável</TableHead><TableHead className="w-[100px]">Prazo</TableHead><TableHead className="w-[100px]">Criada em</TableHead><TableHead className="w-[70px]"></TableHead></TableRow></TableHeader>
          <TableBody>
            {solicitacoes.map((s) => {
              const OrigemIcon = origemIcons[s.origem];
              const clientName = s.client?.razao_social || s.client?.nome;
              const isOverdue = s.data_limite && new Date(s.data_limite) < new Date() && s.status !== 'concluida' && s.status !== 'cancelada';
              return (
                <TableRow key={s.id}>
                  <TableCell><div className="flex items-center gap-2"><OrigemIcon className="h-4 w-4 text-muted-foreground" /><span className="text-xs text-muted-foreground">{ORIGEM_LABELS[s.origem]}</span></div></TableCell>
                  <TableCell><div className="font-medium">{s.titulo}</div>{s.descricao && <div className="text-sm text-muted-foreground truncate max-w-[200px]">{s.descricao}</div>}</TableCell>
                  <TableCell>{clientName ? <span className="text-sm">{clientName}</span> : <span className="text-sm text-muted-foreground">—</span>}</TableCell>
                  <TableCell><Badge className={cn('text-white', prioridadeColors[s.prioridade])}>{PRIORIDADE_LABELS[s.prioridade]}</Badge></TableCell>
                  <TableCell><Badge className={cn('text-white', statusColors[s.status])}>{STATUS_LABELS[s.status]}</Badge></TableCell>
                  <TableCell>{s.assigned_user ? <span className="text-sm">{s.assigned_user.full_name}</span> : <span className="text-sm text-muted-foreground">Não atribuído</span>}</TableCell>
                  <TableCell>{s.data_limite ? <span className={cn('text-sm', isOverdue && 'text-red-500 font-medium')}>{format(new Date(s.data_limite), 'dd/MM/yyyy', { locale: ptBR })}</span> : <span className="text-sm text-muted-foreground">—</span>}</TableCell>
                  <TableCell><span className="text-sm text-muted-foreground">{format(new Date(s.created_at), 'dd/MM/yyyy', { locale: ptBR })}</span></TableCell>
                  <TableCell>
                    <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onView(s)}><Eye className="mr-2 h-4 w-4" />Visualizar</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEdit(s)}><Pencil className="mr-2 h-4 w-4" />Editar</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {s.status === 'pendente' && <DropdownMenuItem onClick={() => onStatusChange(s.id, 'em_andamento')}><Clock className="mr-2 h-4 w-4" />Iniciar</DropdownMenuItem>}
                        {s.status === 'em_andamento' && <DropdownMenuItem onClick={() => onStatusChange(s.id, 'concluida')}><CheckCircle className="mr-2 h-4 w-4" />Concluir</DropdownMenuItem>}
                        {s.status !== 'cancelada' && s.status !== 'concluida' && <DropdownMenuItem onClick={() => onStatusChange(s.id, 'cancelada')}><XCircle className="mr-2 h-4 w-4" />Cancelar</DropdownMenuItem>}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteClick(s.id)}><Trash2 className="mr-2 h-4 w-4" />Excluir</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Confirmar exclusão</AlertDialogTitle><AlertDialogDescription>Tem certeza que deseja excluir esta solicitação? Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleConfirmDelete}>Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </>
  );
}