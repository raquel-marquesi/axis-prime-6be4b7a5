import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, TrendingDown, Percent, Wallet } from 'lucide-react';
interface KPIData { receita: number; despesa: number; saldo: number; margem: number; geracaoCaixa: number; }
const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export function FinancialKPICards({ data }: { data: KPIData }) {
  const cards = [
    { title: 'Receita Total', value: fmt(data.receita), icon: TrendingUp, color: 'text-green-500' },
    { title: 'Despesa Total', value: fmt(data.despesa), icon: TrendingDown, color: 'text-red-500' },
    { title: 'Geração de Caixa', value: fmt(data.geracaoCaixa), icon: DollarSign, color: data.geracaoCaixa >= 0 ? 'text-green-500' : 'text-red-500' },
    { title: 'Margem Líquida', value: data.margem.toFixed(1) + '%', icon: Percent, color: data.margem >= 0 ? 'text-green-500' : 'text-red-500' },
    { title: 'Saldo Atual', value: fmt(data.saldo), icon: Wallet, color: data.saldo >= 0 ? 'text-green-500' : 'text-red-500' },
  ];
  return (<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">{cards.map((c) => (<Card key={c.title}><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{c.title}</CardTitle><c.icon className={`h-4 w-4 ${c.color}`} /></CardHeader><CardContent><p className={`text-xl font-bold ${c.color}`}>{c.value}</p></CardContent></Card>))}</div>);
}