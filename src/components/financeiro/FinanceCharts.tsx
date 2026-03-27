import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--destructive))', 'hsl(210 40% 60%)', 'hsl(30 60% 50%)', 'hsl(150 40% 50%)'];
const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const FinanceCharts = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['finance-charts'],
    queryFn: async () => {
      const now = new Date();
      const months: { label: string; start: string; end: string }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = subMonths(now, i);
        months.push({ label: format(d, 'MMM/yy', { locale: ptBR }), start: format(startOfMonth(d), 'yyyy-MM-dd'), end: format(endOfMonth(d), 'yyyy-MM-dd') });
      }
      const { data: invoices } = await supabase.from('invoices').select('valor, data_emissao, status').gte('data_emissao', months[0].start).lte('data_emissao', months[5].end);
      const { data: expenses } = await supabase.from('expenses').select('valor, data_vencimento, categoria').gte('data_vencimento', months[0].start).lte('data_vencimento', months[5].end);

      const monthly = months.map(m => {
        const receita = (invoices || []).filter(i => i.data_emissao && i.data_emissao >= m.start && i.data_emissao <= m.end && i.status === 'paga').reduce((s, i) => s + (i.valor || 0), 0);
        const despesa = (expenses || []).filter(e => e.data_vencimento >= m.start && e.data_vencimento <= m.end).reduce((s, e) => s + (e.valor || 0), 0);
        return { month: m.label, receita, despesa, resultado: receita - despesa };
      });

      const categorias: Record<string, number> = {};
      (expenses || []).forEach(e => { categorias[e.categoria] = (categorias[e.categoria] || 0) + (e.valor || 0); });
      const pieData = Object.entries(categorias).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, value]) => ({ name, value }));

      return { monthly, pieData };
    },
  });

  if (isLoading) return <div className="grid md:grid-cols-2 gap-4"><Skeleton className="h-72" /><Skeleton className="h-72" /></div>;

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card>
        <CardHeader><CardTitle className="text-base">Receita x Despesa (6 meses)</CardTitle></CardHeader>
        <CardContent>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.monthly}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis tickFormatter={v => `${(v / 1000).toFixed(0)}k`} className="text-xs" />
                <Tooltip formatter={(v: number) => fmt(v)} />
                <Legend />
                <Bar dataKey="receita" name="Receita" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="despesa" name="Despesa" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Despesas por Categoria</CardTitle></CardHeader>
        <CardContent>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data?.pieData || []} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {(data?.pieData || []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => fmt(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FinanceCharts;
