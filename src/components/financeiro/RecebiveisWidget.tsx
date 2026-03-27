import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Clock } from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function useRecebiveis() {
  return useQuery({
    queryKey: ['recebiveis-dashboard'],
    queryFn: async () => {
      const { data, error } = await supabase.from('invoices').select('id, valor, data_vencimento, accounts(nome), billing_contacts(razao_social)').eq('status', 'emitida').not('data_vencimento', 'is', null).order('data_vencimento', { ascending: true });
      if (error) throw error;
      const items = (data || []).map((inv: any) => ({ id: inv.id, account_name: inv.accounts?.nome || '-', contact_name: inv.billing_contacts?.razao_social || '-', valor: inv.valor || 0, data_vencimento: inv.data_vencimento, days: differenceInDays(parseISO(inv.data_vencimento), new Date()) }));
      const atrasados = items.filter(i => i.days < 0);
      const aVencer7 = items.filter(i => i.days >= 0 && i.days <= 7);
      const aVencer15 = items.filter(i => i.days > 7 && i.days <= 15);
      const aVencer30 = items.filter(i => i.days > 15 && i.days <= 30);
      const aVencer60 = items.filter(i => i.days > 30);
      return { atrasados, aVencer7, aVencer15, aVencer30, aVencer60, totalAtrasado: atrasados.reduce((s, i) => s + i.valor, 0), totalAVencer: items.filter(i => i.days >= 0).reduce((s, i) => s + i.valor, 0), all: items };
    },
  });
}

export function RecebiveisWidget() {
  const { data, isLoading } = useRecebiveis();
  if (isLoading) return <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="border-red-200 bg-red-500/5"><CardContent className="p-4"><div className="flex items-center gap-2 mb-1"><AlertTriangle className="h-4 w-4 text-red-500" /><span className="text-xs font-medium text-red-700">Atrasados</span></div><p className="text-lg font-bold text-red-700">{fmt(data?.totalAtrasado || 0)}</p><p className="text-xs text-red-600">{data?.atrasados.length || 0} faturas</p></CardContent></Card>
        <Card className="border-yellow-200 bg-yellow-500/5"><CardContent className="p-4"><div className="flex items-center gap-2 mb-1"><Clock className="h-4 w-4 text-yellow-600" /><span className="text-xs font-medium text-yellow-700">7 dias</span></div><p className="text-lg font-bold text-yellow-700">{fmt(data?.aVencer7.reduce((s, i) => s + i.valor, 0) || 0)}</p></CardContent></Card>
        <Card className="border-orange-200 bg-orange-500/5"><CardContent className="p-4"><div className="flex items-center gap-2 mb-1"><Clock className="h-4 w-4 text-orange-600" /><span className="text-xs font-medium text-orange-700">15 dias</span></div><p className="text-lg font-bold text-orange-700">{fmt(data?.aVencer15.reduce((s, i) => s + i.valor, 0) || 0)}</p></CardContent></Card>
        <Card className="border-blue-200 bg-blue-500/5"><CardContent className="p-4"><div className="flex items-center gap-2 mb-1"><Clock className="h-4 w-4 text-blue-600" /><span className="text-xs font-medium text-blue-700">30 dias</span></div><p className="text-lg font-bold text-blue-700">{fmt(data?.aVencer30.reduce((s, i) => s + i.valor, 0) || 0)}</p></CardContent></Card>
        <Card className="border-muted"><CardContent className="p-4"><div className="flex items-center gap-2 mb-1"><Clock className="h-4 w-4 text-muted-foreground" /><span className="text-xs font-medium text-muted-foreground">60+ dias</span></div><p className="text-lg font-bold">{fmt(data?.aVencer60.reduce((s, i) => s + i.valor, 0) || 0)}</p></CardContent></Card>
      </div>
      {(data?.all.length ?? 0) > 0 && (
        <Card><CardHeader><CardTitle className="text-base">Detalhamento de Recebíveis</CardTitle></CardHeader><CardContent>
          <Table><TableHeader><TableRow><TableHead>Conta</TableHead><TableHead>Contato</TableHead><TableHead className="text-right">Valor</TableHead><TableHead>Vencimento</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>{data?.all.slice(0, 20).map(item => (<TableRow key={item.id}><TableCell className="font-medium text-sm">{item.account_name}</TableCell><TableCell className="text-sm">{item.contact_name}</TableCell><TableCell className="text-right text-sm">{fmt(item.valor)}</TableCell><TableCell className="text-sm">{format(parseISO(item.data_vencimento), 'dd/MM/yyyy')}</TableCell><TableCell>{item.days < 0 ? <Badge variant="destructive">{Math.abs(item.days)}d atrasado</Badge> : item.days <= 7 ? <Badge className="bg-yellow-500">{item.days}d restantes</Badge> : <Badge variant="secondary">{item.days}d restantes</Badge>}</TableCell></TableRow>))}</TableBody>
          </Table></CardContent></Card>
      )}
    </div>
  );
}