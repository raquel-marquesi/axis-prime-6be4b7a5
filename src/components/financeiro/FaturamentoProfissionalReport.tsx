import { useState } from 'react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useFaturamentoProfissionalReport } from '@/hooks/useFinanceReports';

export function FaturamentoProfissionalReport() {
  const now = new Date();
  const [startDate, setStartDate] = useState(format(startOfMonth(now), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(now), 'yyyy-MM-dd'));
  const { data, isLoading } = useFaturamentoProfissionalReport(startDate, endDate);

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
          <CardHeader><CardTitle>Faturamento por Profissional</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Profissional</TableHead><TableHead className="text-right">Total Faturado</TableHead><TableHead className="text-right">Qtd Notas</TableHead><TableHead className="text-right">Média/Nota</TableHead></TableRow></TableHeader>
              <TableBody>
                {data.map((row: any) => (
                  <TableRow key={row.userId}>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell className="text-right">R$ {row.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-right">{row.count}</TableCell>
                    <TableCell className="text-right">R$ {row.average.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
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