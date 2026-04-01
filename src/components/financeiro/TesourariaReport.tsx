import { useState } from 'react';
import { format, startOfYear, endOfMonth } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useTesourariaReport } from '@/hooks/useFinanceReports';
import { ReportExportButton } from '@/components/relatorios/ReportExportButton';

export function TesourariaReport() {
  const now = new Date();
  const [startDate, setStartDate] = useState(format(startOfYear(now), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(now), 'yyyy-MM-dd'));
  const { data, isLoading } = useTesourariaReport(startDate, endDate);

  return (
    <div className="space-y-4">
      <div className="flex gap-4 items-end">
        <div><Label>Data Início</Label><Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} /></div>
        <div><Label>Data Fim</Label><Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} /></div>
      </div>
      {isLoading ? (<p className="text-center text-muted-foreground py-8">Carregando...</p>) : !data ? (<p className="text-center text-muted-foreground py-8">Nenhum dado encontrado.</p>) : (
        <>
          <Card><CardHeader><CardTitle>Saldo por Conta Bancária</CardTitle></CardHeader><CardContent>
            <Table><TableHeader><TableRow><TableHead>Conta</TableHead><TableHead>Banco</TableHead><TableHead className="text-right">Entradas</TableHead><TableHead className="text-right">Saídas</TableHead><TableHead className="text-right">Saldo</TableHead></TableRow></TableHeader>
              <TableBody>{data.accounts.map((acc: any) => (<TableRow key={acc.id}><TableCell className="font-medium">{acc.descricao || `${acc.banco} - ${acc.conta}`}</TableCell><TableCell>{acc.banco}</TableCell><TableCell className="text-right text-green-600">R$ {acc.entradas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell><TableCell className="text-right text-red-600">R$ {acc.saidas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell><TableCell className="text-right font-semibold">R$ {acc.saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell></TableRow>))}</TableBody>
            </Table></CardContent></Card>
          {data.monthlyData.length > 0 && (<Card><CardHeader><CardTitle>Evolução Mensal</CardTitle></CardHeader><CardContent><div className="h-[300px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={data.monthlyData}><XAxis dataKey="month" /><YAxis /><Tooltip formatter={(v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} /><Legend /><Bar dataKey="entradas" name="Entradas" fill="hsl(var(--chart-2))" /><Bar dataKey="saidas" name="Saídas" fill="hsl(var(--chart-5))" /></BarChart></ResponsiveContainer></div></CardContent></Card>)}
        </>
      )}
    </div>
  );
}