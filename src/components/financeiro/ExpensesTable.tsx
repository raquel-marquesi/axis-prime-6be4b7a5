import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { MoreHorizontal, Pencil, Trash2, CheckCircle } from 'lucide-react';
import { useExpenses } from '@/hooks/useExpenses';

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pendente: { label: 'Pendente', variant: 'secondary' },
  pago: { label: 'Pago', variant: 'default' },
  vencido: { label: 'Vencido', variant: 'destructive' },
  cancelado: { label: 'Cancelado', variant: 'outline' },
};

export function ExpensesTable() {
  const { expenses, isLoading, deleteExpense, updateExpense } = useExpenses();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleMarkPaid = (id: string) => {
    updateExpense.mutate({ id, status: 'pago', data_pagamento: format(new Date(), 'yyyy-MM-dd') } as any);
  };

  if (isLoading) return <div className="flex items-center justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  if (expenses.length === 0) return <p className="text-center text-muted-foreground py-8">Nenhuma despesa encontrada.</p>;

  return (
    <>
      <Table>
        <TableHeader><TableRow><TableHead>Descrição</TableHead><TableHead>Fornecedor</TableHead><TableHead>Categoria</TableHead><TableHead>Vencimento</TableHead><TableHead className="text-right">Valor</TableHead><TableHead>Status</TableHead><TableHead className="w-16"></TableHead></TableRow></TableHeader>
        <TableBody>
          {expenses.map((e: any) => {
            const st = statusMap[e.status] || { label: e.status, variant: 'outline' as const };
            return (
              <TableRow key={e.id}>
                <TableCell className="font-medium max-w-[200px] truncate">{e.descricao}</TableCell>
                <TableCell>{e.fornecedor || '—'}</TableCell>
                <TableCell><Badge variant="outline">{e.categoria}</Badge></TableCell>
                <TableCell>{format(new Date(e.data_vencimento), 'dd/MM/yyyy', { locale: ptBR })}</TableCell>
                <TableCell className="text-right font-medium">{fmt(e.valor)}</TableCell>
                <TableCell><Badge variant={st.variant}>{st.label}</Badge></TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {e.status === 'pendente' && <DropdownMenuItem onClick={() => handleMarkPaid(e.id)}><CheckCircle className="mr-2 h-4 w-4" />Marcar como pago</DropdownMenuItem>}
                      <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(e.id)}><Trash2 className="mr-2 h-4 w-4" />Excluir</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir despesa?</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => { if (deleteId) deleteExpense.mutate(deleteId); setDeleteId(null); }}>Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </>
  );
}
