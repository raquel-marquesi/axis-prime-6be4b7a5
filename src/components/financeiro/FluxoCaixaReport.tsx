import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ReportExportButton } from '@/components/relatorios/ReportExportButton';

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function FluxoCaixaReport() {
  const { data, isLoading } = useQuery({
    queryKey: ['fluxo-caixa-report'],
    queryFn: async () => {
      const now = new Date();
      const start = startOfMonth(subMonths(now, 11));
      const end = endOfMonth(now);
      const months = eachMonthOfInterval({ start, end });

      const { data: invoices } = await supabase.from('invoices').select('valor, data_emissao, status').eq('status', 'paga').gte('data_emissao', format(start, 'yyyy-MM-dd')).lte('data_emissao', format(end, 'yyyy-MM-dd'));
      const { data: expenses } = await supabase.from('expenses').select('valor, data_vencimento, status').gte('data_vencimento', format(start, 'yyyy-MM-dd')).lte('data_vencimento', format(end, 'yyyy-MM-dd'));

      let saldoAcumulado = 0;
      return months.map(m => {
        const mStart = format(startOfMonth(m), 'yyyy-MM-dd');
        const mEnd = format(endOfMonth(m), 'yyyy-MM-dd');
        const entradas = (invoices || []).filter(i => i.data_emissao && i.data_emissao >= mStart && i.data_emissao <= mEnd).reduce((s, i) => s + (i.valor || 0), 0);
        const saidas = (expenses || []).filter(e => e.data_vencimento >= mStart && e.data_vencimento <= mEnd).reduce((s, e) => s + (e.valor || 0), 0);
        saldoAcumulado += entradas - saidas;
        return { month: format(m, 'MMM/yy', { locale: ptBR }), entradas, saidas, saldo: saldoAcumulado };
      });
    },
  });

  if (isLoading) return <Skeleton className="h-80" />;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div><CardTitle>Fluxo de Caixa</CardTitle><CardDescription>Entradas, saídas e saldo acumulado dos últimos 12 meses.</CardDescription></div>
        {data && <ReportExportButton data={data} columns={[{ key: 'month', label: 'Mês' }, { key: 'entradas', label: 'Entradas', format: fmt }, { key: 'saidas', label: 'Saídas', format: fmt }, { key: 'saldo', label: 'Saldo Acumulado', format: fmt }]} filename="fluxo-caixa" />}
      </CardHeader>
      <CardContent>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="month" className="text-xs" />
              <YAxis tickFormatter={v => `${(v / 1000).toFixed(0)}k`} className="text-xs" />
              <Tooltip formatter={(v: number) => fmt(v)} />
              <Area type="monotone" dataKey="entradas" name="Entradas" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.15} />
              <Area type="monotone" dataKey="saidas" name="Saídas" stroke="hsl(var(--destructive))" fill="hsl(var(--destructive))" fillOpacity={0.15} />
              <Area type="monotone" dataKey="saldo" name="Saldo" stroke="hsl(150 40% 50%)" fill="hsl(150 40% 50%)" fillOpacity={0.1} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
