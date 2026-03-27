import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { MoreHorizontal, Trash2, CheckCircle } from 'lucide-react';
import { useInvoices } from '@/hooks/useInvoices';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pendente: { label: 'Pendente', variant: 'secondary' },
  paga: { label: 'Paga', variant: 'default' },
  vencida: { label: 'Vencida', variant: 'destructive' },
  cancelada: { label: 'Cancelada', variant: 'outline' },
};

export function InvoicesTable() {
  const { invoices, isLoading } = useInvoices();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleMarkPaid = async (id: string) => {
    const { error } = await supabase.from('invoices').update({ status: 'paga' }).eq('id', id);
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Fatura marcada como paga' }); queryClient.invalidateQueries({ queryKey: ['invoices'] }); }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('invoices').delete().eq('id', id);
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Fatura excluída' }); queryClient.invalidateQueries({ queryKey: ['invoices'] }); }
    setDeleteId(null);
  };

  if (isLoading) return <div className="flex items-center justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  if (invoices.length === 0) return <p className="text-center text-muted-foreground py-8">Nenhuma fatura encontrada.</p>;

  return (
    <>
      <Table>
        <TableHeader><TableRow><TableHead>NF</TableHead><TableHead>Descrição</TableHead><TableHead>Emissão</TableHead><TableHead>Vencimento</TableHead><TableHead className="text-right">Valor</TableHead><TableHead>Status</TableHead><TableHead className="w-16"></TableHead></TableRow></TableHeader>
        <TableBody>
          {invoices.map((inv: any) => {
            const st = statusMap[inv.status] || { label: inv.status, variant: 'outline' as const };
            return (
              <TableRow key={inv.id}>
                <TableCell className="font-medium">{inv.numero_nf || '—'}</TableCell>
                <TableCell className="max-w-[200px] truncate">{inv.descricao || '—'}</TableCell>
                <TableCell>{inv.data_emissao ? format(new Date(inv.data_emissao), 'dd/MM/yyyy', { locale: ptBR }) : '—'}</TableCell>
                <TableCell>{inv.data_vencimento ? format(new Date(inv.data_vencimento), 'dd/MM/yyyy', { locale: ptBR }) : '—'}</TableCell>
                <TableCell className="text-right font-medium">{fmt(inv.valor || 0)}</TableCell>
                <TableCell><Badge variant={st.variant}>{st.label}</Badge></TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {inv.status === 'pendente' && <DropdownMenuItem onClick={() => handleMarkPaid(inv.id)}><CheckCircle className="mr-2 h-4 w-4" />Marcar como paga</DropdownMenuItem>}
                      <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(inv.id)}><Trash2 className="mr-2 h-4 w-4" />Excluir</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir fatura?</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => deleteId && handleDelete(deleteId)}>Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </>
  );
}
