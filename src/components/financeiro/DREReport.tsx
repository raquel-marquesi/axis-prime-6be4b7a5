import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { ReportExportButton } from '@/components/relatorios/ReportExportButton';

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function DREReport() {
  const { data: invoices = [], isLoading: l1 } = useQuery({
    queryKey: ['dre-invoices'],
    queryFn: async () => {
      const { data, error } = await supabase.from('invoices').select('valor, status').eq('status', 'paga');
      if (error) throw error;
      return data;
    },
  });
  const { data: expenses = [], isLoading: l2 } = useQuery({
    queryKey: ['dre-expenses'],
    queryFn: async () => {
      const { data, error } = await supabase.from('expenses').select('valor, categoria');
      if (error) throw error;
      return data;
    },
  });

  const dre = useMemo(() => {
    const receitaBruta = invoices.reduce((s, i: any) => s + (i.valor || 0), 0);
    const deducoes = receitaBruta * 0.0565; // Simples Nacional médio
    const receitaLiquida = receitaBruta - deducoes;
    const despesasPorCategoria: Record<string, number> = {};
    expenses.forEach((e: any) => { despesasPorCategoria[e.categoria] = (despesasPorCategoria[e.categoria] || 0) + (e.valor || 0); });
    const totalDespesas = expenses.reduce((s, e: any) => s + (e.valor || 0), 0);
    const resultadoOperacional = receitaLiquida - totalDespesas;
    const resultadoLiquido = resultadoOperacional;
    const margem = receitaBruta > 0 ? (resultadoLiquido / receitaBruta * 100) : 0;

    return { receitaBruta, deducoes, receitaLiquida, despesasPorCategoria, totalDespesas, resultadoOperacional, resultadoLiquido, margem };
  }, [invoices, expenses]);

  if (l1 || l2) return <Skeleton className="h-64" />;

  const dreRows = [
    { label: 'Receita Bruta', value: dre.receitaBruta, bold: true },
    { label: '(-) Deduções / Impostos s/ Receita', value: -dre.deducoes },
    { label: '= Receita Líquida', value: dre.receitaLiquida, bold: true },
    { label: '', value: 0, separator: true },
    ...Object.entries(dre.despesasPorCategoria).map(([cat, val]) => ({ label: `(-) ${cat}`, value: -val })),
    { label: '= Total Despesas Operacionais', value: -dre.totalDespesas, bold: true },
    { label: '', value: 0, separator: true },
    { label: '= Resultado Operacional', value: dre.resultadoOperacional, bold: true },
    { label: '= Resultado Líquido', value: dre.resultadoLiquido, bold: true, highlight: true },
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div><CardTitle>Demonstrativo de Resultado (DRE)</CardTitle><CardDescription>Visão consolidada de receitas e despesas.</CardDescription></div>
        <ReportExportButton data={dreRows.filter(r => !r.separator)} columns={[{ key: 'label', label: 'Conta' }, { key: 'value', label: 'Valor', format: fmt }]} filename="dre" />
      </CardHeader>
      <CardContent>
        <div className="mb-4 grid grid-cols-3 gap-4">
          <div className="text-center p-3 rounded-lg bg-muted/50"><p className="text-sm text-muted-foreground">Receita Bruta</p><p className="text-lg font-bold">{fmt(dre.receitaBruta)}</p></div>
          <div className="text-center p-3 rounded-lg bg-muted/50"><p className="text-sm text-muted-foreground">Resultado Líquido</p><p className={`text-lg font-bold ${dre.resultadoLiquido >= 0 ? 'text-green-600' : 'text-destructive'}`}>{fmt(dre.resultadoLiquido)}</p></div>
          <div className="text-center p-3 rounded-lg bg-muted/50"><p className="text-sm text-muted-foreground">Margem Líquida</p><p className={`text-lg font-bold ${dre.margem >= 0 ? 'text-green-600' : 'text-destructive'}`}>{dre.margem.toFixed(1)}%</p></div>
        </div>
        <Table>
          <TableHeader><TableRow><TableHead>Conta</TableHead><TableHead className="text-right">Valor (R$)</TableHead></TableRow></TableHeader>
          <TableBody>
            {dreRows.map((row, i) => row.separator ? (
              <TableRow key={i}><TableCell colSpan={2}><Separator /></TableCell></TableRow>
            ) : (
              <TableRow key={i} className={row.highlight ? 'bg-muted/50' : ''}>
                <TableCell className={row.bold ? 'font-bold' : 'pl-8'}>{row.label}</TableCell>
                <TableCell className={`text-right ${row.bold ? 'font-bold' : ''} ${row.value < 0 ? 'text-destructive' : ''}`}>{fmt(row.value)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
