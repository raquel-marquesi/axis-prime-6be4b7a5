import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pendente: { label: 'Pendente', variant: 'secondary' },
  paga: { label: 'Paga', variant: 'default' },
  cancelada: { label: 'Cancelada', variant: 'destructive' },
  vencida: { label: 'Vencida', variant: 'destructive' },
};

const FinanceTable = () => {
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['finance-table-recent'],
    queryFn: async () => {
      const { data, error } = await supabase.from('invoices').select('id, numero_nf, valor, status, data_emissao, data_vencimento, descricao').order('created_at', { ascending: false }).limit(20);
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <Card>
      <CardHeader><CardTitle>Últimas Movimentações</CardTitle></CardHeader>
      <CardContent>
        {invoices.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Nenhuma movimentação recente.</p>
        ) : (
          <Table>
            <TableHeader><TableRow><TableHead>NF</TableHead><TableHead>Descrição</TableHead><TableHead>Emissão</TableHead><TableHead>Vencimento</TableHead><TableHead className="text-right">Valor</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
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
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default FinanceTable;
