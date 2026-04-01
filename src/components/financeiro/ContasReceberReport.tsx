import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ReportExportButton } from '@/components/relatorios/ReportExportButton';

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function ContasReceberReport() {
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['contas-receber-report'],
    queryFn: async () => {
      const { data, error } = await supabase.from('invoices').select('*, billing_contact:billing_contacts!billing_contact_id(razao_social)').order('data_vencimento', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const filtered = statusFilter === 'all' ? invoices : invoices.filter((i: any) => i.status === statusFilter);
  const total = filtered.reduce((s: number, i: any) => s + (i.valor || 0), 0);

  if (isLoading) return <Skeleton className="h-64" />;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Contas a Receber</CardTitle>
        <div className="flex gap-2 items-center">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="paga">Paga</SelectItem>
              <SelectItem value="vencida">Vencida</SelectItem>
            </SelectContent>
          </Select>
          <ReportExportButton data={filtered.map((i: any) => ({
            ...i,
            tomador: (i.billing_contact as any)?.razao_social || '',
            centro_custo_nf: (i.billing_contact as any)?.centro_custo || '',
          }))} columns={[
            { key: 'numero_nf', label: 'NF' },
            { key: 'descricao', label: 'Descrição' },
            { key: 'tomador', label: 'Tomador' },
            { key: 'valor', label: 'Valor', format: fmt },
            { key: 'data_emissao', label: 'Data Emissão' },
            { key: 'data_vencimento', label: 'Vencimento' },
            { key: 'centro_custo_nf', label: 'Centro de Custo' },
            { key: 'status', label: 'Status' },
          ]} filename="contas-receber" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 p-3 rounded-lg bg-muted/50 text-center">
          <p className="text-sm text-muted-foreground">Total Filtrado</p>
          <p className="text-xl font-bold">{fmt(total)}</p>
        </div>
        {filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Nenhuma fatura encontrada.</p>
        ) : (
          <Table>
            <TableHeader><TableRow><TableHead>NF</TableHead><TableHead>Descrição</TableHead><TableHead>Tomador</TableHead><TableHead>Vencimento</TableHead><TableHead className="text-right">Valor</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {filtered.map((i: any) => (
                <TableRow key={i.id}>
                  <TableCell className="font-medium">{i.numero_nf || '—'}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{i.descricao || '—'}</TableCell>
                  <TableCell>{(i.billing_contact as any)?.razao_social || '—'}</TableCell>
                  <TableCell>{i.data_vencimento ? format(new Date(i.data_vencimento), 'dd/MM/yyyy', { locale: ptBR }) : '—'}</TableCell>
                  <TableCell className="text-right">{fmt(i.valor || 0)}</TableCell>
                  <TableCell><Badge variant={i.status === 'paga' ? 'default' : i.status === 'vencida' ? 'destructive' : 'secondary'}>{i.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
