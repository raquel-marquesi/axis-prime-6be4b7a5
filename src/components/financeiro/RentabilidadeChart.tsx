import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp } from 'lucide-react';

export function RentabilidadeChart() {
  const { data, isLoading } = useQuery({
    queryKey: ['rentabilidade-cliente'],
    queryFn: async () => {
      const { data, error } = await supabase.from('invoices').select('valor, accounts(nome)').eq('status', 'paga');
      if (error) throw error;
      const byAccount: Record<string, { name: string; total: number }> = {};
      (data || []).forEach((inv: any) => { const name = inv.accounts?.nome || 'Sem conta'; if (!byAccount[name]) byAccount[name] = { name, total: 0 }; byAccount[name].total += inv.valor || 0; });
      return Object.values(byAccount).sort((a, b) => b.total - a.total).slice(0, 10);
    },
  });

  if (isLoading) return <Skeleton className="h-80" />;

  return (
    <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><TrendingUp className="h-5 w-5 text-primary" />Rentabilidade por Cliente</CardTitle></CardHeader>
      <CardContent>{data && data.length > 0 ? (<div className="h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={data} layout="vertical" margin={{ left: 20 }}><CartesianGrid strokeDasharray="3 3" className="stroke-border" /><XAxis type="number" tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} className="text-xs" /><YAxis type="category" dataKey="name" width={120} className="text-xs" tick={{ fontSize: 11 }} /><Tooltip formatter={(v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} /><Bar dataKey="total" name="Faturamento" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} /></BarChart></ResponsiveContainer></div>) : (<p className="text-center text-muted-foreground py-8 text-sm">Nenhum faturamento registrado</p>)}</CardContent>
    </Card>
  );
}