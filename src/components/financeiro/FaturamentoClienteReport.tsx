import { useState } from 'react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useFaturamentoClienteReport } from '@/hooks/useFinanceReports';

export function FaturamentoClienteReport() {
  const now = new Date();
  const [startDate, setStartDate] = useState(format(startOfMonth(now), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(now), 'yyyy-MM-dd'));
  const { data, isLoading } = useFaturamentoClienteReport(startDate, endDate);

  return (
    <div className="space-y-4">
      <div className="flex gap-4 items-end">
        <div><Label>Data Início</Label><Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} /></div>
        <div><Label>Data Fim</Label><Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} /></div>
      </div>
      {isLoading ? (
        <p className="text-center text-muted-foreground py-8">Carregando...</p>
      ) : !data || data.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">Nenhum dado encontrado no período.</p>
      ) : (
        <Card>
          <CardHeader><CardTitle>Faturamento por Cliente/Conta</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Conta</TableHead><TableHead className="text-right">Total</TableHead><TableHead className="text-right">Emitidas</TableHead><TableHead className="text-right">Pagas</TableHead><TableHead className="text-right">Em Atraso</TableHead><TableHead className="text-right">Qtd Notas</TableHead></TableRow></TableHeader>
              <TableBody>
                {data.map((row: any) => (
                  <TableRow key={row.accountId}>
                    <TableCell className="font-medium">{row.accountName}</TableCell>
                    <TableCell className="text-right">R$ {row.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-right"><Badge variant="outline" className="bg-blue-500/10 text-blue-700">R$ {row.emitidas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</Badge></TableCell>
                    <TableCell className="text-right"><Badge variant="outline" className="bg-green-500/10 text-green-700">R$ {row.pagas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</Badge></TableCell>
                    <TableCell className="text-right"><Badge variant="outline" className="bg-red-500/10 text-red-700">R$ {row.emAtraso.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</Badge></TableCell>
                    <TableCell className="text-right">{row.count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}