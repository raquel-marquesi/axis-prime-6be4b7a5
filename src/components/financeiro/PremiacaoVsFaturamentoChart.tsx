import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Scale } from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function PremiacaoVsFaturamentoChart() {
  const { data, isLoading } = useQuery({
    queryKey: ['premiacao-vs-faturamento'],
    queryFn: async () => {
      const now = new Date();
      const months: { label: string; start: string; end: string }[] = [];
      for (let i = 5; i >= 0; i--) { const d = subMonths(now, i); months.push({ label: format(d, 'MMM/yy', { locale: ptBR }), start: format(startOfMonth(d), 'yyyy-MM-dd'), end: format(endOfMonth(d), 'yyyy-MM-dd') }); }
      const { data: invoices } = await supabase.from('invoices').select('valor, data_emissao').eq('status', 'paga').gte('data_emissao', months[0].start).lte('data_emissao', months[months.length - 1].end);
      const { data: bonuses } = await supabase.from('bonus_calculations').select('bonus_amount, reference_month').gte('reference_month', months[0].start).lte('reference_month', months[months.length - 1].end);
      return months.map(m => {
        const faturamento = (invoices || []).filter(inv => inv.data_emissao && inv.data_emissao >= m.start && inv.data_emissao <= m.end).reduce((s, inv) => s + (inv.valor || 0), 0);
        const premiacao = (bonuses || []).filter(b => b.reference_month >= m.start && b.reference_month <= m.end).reduce((s, b) => s + (b.bonus_amount || 0), 0);
        return { month: m.label, faturamento, premiacao, margem: faturamento > 0 ? Math.round((faturamento - premiacao) / faturamento * 100) : 0 };
      });
    },
  });

  if (isLoading) return <Skeleton className="h-80" />;
  const totalFat = data?.reduce((s, d) => s + d.faturamento, 0) || 0;
  const totalPrem = data?.reduce((s, d) => s + d.premiacao, 0) || 0;
  const margemGeral = totalFat > 0 ? ((totalFat - totalPrem) / totalFat * 100).toFixed(1) : '0';
  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Scale className="h-5 w-5 text-primary" />Premiação x Faturamento</CardTitle></CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="text-center p-2 rounded bg-muted/50"><p className="text-xs text-muted-foreground">Faturamento</p><p className="text-sm font-bold">{fmt(totalFat)}</p></div>
          <div className="text-center p-2 rounded bg-muted/50"><p className="text-xs text-muted-foreground">Premiação</p><p className="text-sm font-bold">{fmt(totalPrem)}</p></div>
          <div className="text-center p-2 rounded bg-primary/10"><p className="text-xs text-muted-foreground">Margem</p><p className="text-sm font-bold text-primary">{margemGeral}%</p></div>
        </div>
        {data && data.length > 0 ? (<div className="h-56"><ResponsiveContainer width="100%" height="100%"><BarChart data={data}><CartesianGrid strokeDasharray="3 3" className="stroke-border" /><XAxis dataKey="month" className="text-xs" /><YAxis tickFormatter={v => `${(v / 1000).toFixed(0)}k`} className="text-xs" /><Tooltip formatter={(v: number) => fmt(v)} /><Legend /><Bar dataKey="faturamento" name="Faturamento" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} /><Bar dataKey="premiacao" name="Premiação" fill="hsl(31 24% 60%)" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div>) : (<p className="text-center text-muted-foreground py-8 text-sm">Sem dados no período</p>)}
      </CardContent>
    </Card>
  );
}