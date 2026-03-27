import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DollarSign, TrendingUp, TrendingDown, Wallet } from 'lucide-react';

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const FinanceSummary = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['finance-summary'],
    queryFn: async () => {
      const { data: invoices } = await supabase.from('invoices').select('valor, status');
      const { data: expenses } = await supabase.from('expenses').select('valor, status');
      const totalReceita = (invoices || []).filter(i => i.status === 'paga').reduce((s, i) => s + (i.valor || 0), 0);
      const totalPendente = (invoices || []).filter(i => i.status === 'pendente').reduce((s, i) => s + (i.valor || 0), 0);
      const totalDespesa = (expenses || []).reduce((s, e) => s + (e.valor || 0), 0);
      return { totalReceita, totalPendente, totalDespesa, saldo: totalReceita - totalDespesa };
    },
  });

  if (isLoading) return <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-24" />)}</div>;

  const cards = [
    { title: 'Receita Recebida', value: fmt(data?.totalReceita || 0), icon: TrendingUp, color: 'text-green-600' },
    { title: 'A Receber', value: fmt(data?.totalPendente || 0), icon: DollarSign, color: 'text-blue-600' },
    { title: 'Despesas', value: fmt(data?.totalDespesa || 0), icon: TrendingDown, color: 'text-destructive' },
    { title: 'Saldo', value: fmt(data?.saldo || 0), icon: Wallet, color: (data?.saldo || 0) >= 0 ? 'text-green-600' : 'text-destructive' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map(c => (
        <Card key={c.title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{c.title}</CardTitle>
            <c.icon className={`h-4 w-4 ${c.color}`} />
          </CardHeader>
          <CardContent><p className={`text-xl font-bold ${c.color}`}>{c.value}</p></CardContent>
        </Card>
      ))}
    </div>
  );
};

export default FinanceSummary;
