import { useMemo } from 'react';
import { useInvoices } from '@/hooks/useInvoices';
import { useExpenses } from '@/hooks/useExpenses';
import { FinancialKPICards } from './FinancialKPICards';
import { MovingAveragesCard } from './MovingAveragesCard';
import { BreakevenCalculator } from './BreakevenCalculator';
import { ScenarioProjectionChart } from './ScenarioProjectionChart';
import { TrendLineChart } from './TrendLineChart';
import { format, subMonths, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function AnaliseFinanceiraTab() {
  const { invoices } = useInvoices();
  const { expenses } = useExpenses();
  const kpis = useMemo(() => {
    const receita = invoices.filter(i => i.status === 'paga').reduce((s, i) => s + Number(i.valor || 0), 0);
    const despesa = expenses.filter(e => e.status === 'paga').reduce((s, e) => s + Number(e.valor || 0), 0);
    const saldo = receita - despesa;
    const margem = receita > 0 ? (saldo / receita) * 100 : 0;
    return { receita, despesa, saldo, margem, geracaoCaixa: saldo };
  }, [invoices, expenses]);
  const monthlyData = useMemo(() => {
    const months: { name: string; receita: number; despesa: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const start = startOfMonth(date); const end = endOfMonth(date);
      const label = format(date, 'MMM/yy', { locale: ptBR });
      const rec = invoices.filter(inv => inv.data_emissao && parseISO(inv.data_emissao) >= start && parseISO(inv.data_emissao) <= end && inv.status === 'paga').reduce((s, i) => s + Number(i.valor || 0), 0);
      const desp = expenses.filter(exp => exp.data_vencimento && parseISO(exp.data_vencimento) >= start && parseISO(exp.data_vencimento) <= end && exp.status === 'paga').reduce((s, e) => s + Number(e.valor || 0), 0);
      months.push({ name: label, receita: rec, despesa: desp });
    }
    return months;
  }, [invoices, expenses]);
  const movingAverages = useMemo(() => {
    const calc = (arr: number[], n: number) => { const slice = arr.slice(-n); return slice.length > 0 ? slice.reduce((a, b) => a + b, 0) / slice.length : 0; };
    const recArr = monthlyData.map(m => m.receita); const despArr = monthlyData.map(m => m.despesa);
    return [
      { label: 'Receita', avg3m: calc(recArr, 3), avg6m: calc(recArr, 6), avg12m: calc(recArr, 12) },
      { label: 'Despesa', avg3m: calc(despArr, 3), avg6m: calc(despArr, 6), avg12m: calc(despArr, 12) },
    ];
  }, [monthlyData]);
  const scenarioData = useMemo(() => {
    const avg = movingAverages[0]?.avg3m || 0;
    return ['Mês 1', 'Mês 2', 'Mês 3', 'Mês 4', 'Mês 5', 'Mês 6'].map(month => ({ month, conservador: avg * 0.85, base: avg, otimista: avg * 1.15 }));
  }, [movingAverages]);
  return (
    <div className="space-y-6">
      <FinancialKPICards data={kpis} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TrendLineChart title="Receita Mensal" data={monthlyData.map(m => ({ name: m.name, value: m.receita }))} color="hsl(var(--chart-2))" />
        <TrendLineChart title="Despesa Mensal" data={monthlyData.map(m => ({ name: m.name, value: m.despesa }))} color="hsl(var(--destructive))" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6"><MovingAveragesCard data={movingAverages} /><BreakevenCalculator /></div>
      <ScenarioProjectionChart data={scenarioData} />
    </div>
  );
}