import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarDays } from 'lucide-react';
import { format, parseISO, startOfWeek, endOfWeek, addWeeks, isWithinInterval, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AgendaItem { id: string; account_name: string; contact_name: string; valor: number; data_vencimento: string; days: number; }
interface WeekGroup { label: string; start: Date; end: Date; items: AgendaItem[]; }

export function AgendaFaturamentoWidget() {
  const { data, isLoading } = useQuery({
    queryKey: ['agenda-faturamento'],
    queryFn: async () => {
      const today = new Date();
      const futureLimit = addWeeks(today, 8);
      const { data, error } = await supabase
        .from('invoices')
        .select('id, valor, data_vencimento, accounts(nome), billing_contacts(razao_social)')
        .eq('status', 'emitida')
        .not('data_vencimento', 'is', null)
        .gte('data_vencimento', today.toISOString().split('T')[0])
        .lte('data_vencimento', futureLimit.toISOString().split('T')[0])
        .order('data_vencimento', { ascending: true });
      if (error) throw error;
      const items: AgendaItem[] = (data || []).map((inv: any) => ({
        id: inv.id, account_name: inv.accounts?.nome || '-', contact_name: inv.billing_contacts?.razao_social || '-',
        valor: inv.valor || 0, data_vencimento: inv.data_vencimento, days: differenceInDays(parseISO(inv.data_vencimento), today),
      }));
      const weeks: WeekGroup[] = [];
      for (let i = 0; i < 8; i++) {
        const weekStart = startOfWeek(addWeeks(today, i), { weekStartsOn: 1 });
        const weekEnd = endOfWeek(addWeeks(today, i), { weekStartsOn: 1 });
        const weekItems = items.filter(item => { const d = parseISO(item.data_vencimento); return isWithinInterval(d, { start: weekStart, end: weekEnd }); });
        if (weekItems.length > 0) { weeks.push({ label: `${format(weekStart, 'dd/MM', { locale: ptBR })} - ${format(weekEnd, 'dd/MM', { locale: ptBR })}`, start: weekStart, end: weekEnd, items: weekItems }); }
      }
      return weeks;
    },
  });
  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  if (isLoading) return <Skeleton className="h-48" />;
  if (!data?.length) return null;
  return (
    <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><CalendarDays className="h-5 w-5 text-primary" />Agenda de Faturamento</CardTitle></CardHeader>
      <CardContent><div className="space-y-4">{data.map(week => (
        <div key={week.label}><p className="text-xs font-semibold text-muted-foreground mb-2">Semana {week.label}</p><div className="space-y-2">{week.items.map(item => (
          <div key={item.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50"><div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{item.account_name}</p><p className="text-xs text-muted-foreground truncate">{item.contact_name}</p></div>
            <div className="flex items-center gap-3 shrink-0"><span className="text-sm font-bold">{fmt(item.valor)}</span><Badge variant={item.days <= 3 ? 'destructive' : item.days <= 7 ? 'default' : 'secondary'} className="text-xs">{format(parseISO(item.data_vencimento), 'dd/MM')}</Badge></div></div>
        ))}</div></div>))}</div></CardContent></Card>
  );
}