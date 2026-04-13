import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { startOfMonth, endOfMonth } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ReportExportButton } from '@/components/relatorios/ReportExportButton';

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function ContasPagarReport() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ['contas-pagar-report', startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase.from('expenses')
        .select('*')
        .gte('data_vencimento', startDate)
        .lte('data_vencimento', endDate)
        .order('data_vencimento', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const filtered = statusFilter === 'all' ? expenses : expenses.filter((e: any) => e.status === statusFilter);
  const total = filtered.reduce((s: number, e: any) => s + (e.valor || 0), 0);

  if (isLoading) return <Skeleton className="h-64" />;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Contas a Pagar</CardTitle>
        <div className="flex gap-2 items-center flex-wrap">
          <Input type="date" className="w-36" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <span className="text-muted-foreground">-</span>
          <Input type="date" className="w-36" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="pago">Pago</SelectItem>
              <SelectItem value="vencido">Vencido</SelectItem>
            </SelectContent>
          </Select>
          <ReportExportButton data={filtered} columns={[
            { key: 'descricao', label: 'Descrição' },
            { key: 'fornecedor', label: 'Fornecedor' },
            { key: 'categoria', label: 'Categoria' },
            { key: 'centro_custo', label: 'Centro de Custo' },
            { key: 'valor', label: 'Valor', format: fmt },
            { key: 'data_vencimento', label: 'Vencimento' },
            { key: 'data_pagamento', label: 'Data Pagamento' },
            { key: 'numero_documento', label: 'Nº Documento' },
            { key: 'status', label: 'Status' },
          ]} filename="contas-pagar" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 p-3 rounded-lg bg-muted/50 text-center">
          <p className="text-sm text-muted-foreground">Total Filtrado</p>
          <p className="text-xl font-bold">{fmt(total)}</p>
        </div>
        {filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Nenhuma conta encontrada.</p>
        ) : (
          <Table>
            <TableHeader><TableRow><TableHead>Descrição</TableHead><TableHead>Fornecedor</TableHead><TableHead>Vencimento</TableHead><TableHead className="text-right">Valor</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {filtered.map((e: any) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium max-w-[200px] truncate">{e.descricao}</TableCell>
                  <TableCell>{e.fornecedor || '—'}</TableCell>
                  <TableCell>{format(new Date(e.data_vencimento), 'dd/MM/yyyy', { locale: ptBR })}</TableCell>
                  <TableCell className="text-right">{fmt(e.valor)}</TableCell>
                  <TableCell><Badge variant={e.status === 'pago' ? 'default' : e.status === 'vencido' ? 'destructive' : 'secondary'}>{e.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
