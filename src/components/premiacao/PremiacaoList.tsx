import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle, Clock, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useBonus } from '@/hooks/useBonus';
import { useProfiles } from '@/hooks/useProfiles';

const statusConfig: Record<string, { label: string; icon: typeof Clock; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'Pendente', icon: Clock, variant: 'secondary' },
  approved: { label: 'Aprovado', icon: CheckCircle, variant: 'default' },
  rejected: { label: 'Rejeitado', icon: XCircle, variant: 'destructive' },
  paid: { label: 'Pago', icon: CheckCircle, variant: 'outline' },
};

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const PremiacaoList = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const { allBonus, isLoadingAll } = useBonus();
  const { profiles } = useProfiles();
  const refMonth = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
  const refEnd = format(endOfMonth(currentMonth), 'yyyy-MM-dd');
  const bonuses = allBonus.filter(b => b.reference_month >= refMonth && b.reference_month <= refEnd);

  const profilesMap = useMemo(() => {
    const m: Record<string, string> = {};
    profiles.forEach(p => { m[p.user_id] = p.full_name; });
    return m;
  }, [profiles]);

  if (isLoadingAll) return <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Premiações — {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}</CardTitle>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setCurrentMonth(m => subMonths(m, 1))}><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentMonth(new Date())}>Hoje</Button>
          <Button variant="outline" size="icon" onClick={() => setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </CardHeader>
      <CardContent>
        {bonuses.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Nenhuma premiação calculada para este mês.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Profissional</TableHead>
                <TableHead>Área</TableHead>
                <TableHead className="text-right">Meta</TableHead>
                <TableHead className="text-right">Produção</TableHead>
                <TableHead className="text-right">Excedente</TableHead>
                <TableHead className="text-right">Valor Bônus</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bonuses.map((b: any) => {
                const cfg = statusConfig[b.status] || statusConfig.pending;
                const Icon = cfg.icon;
                return (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">{profilesMap[b.user_id] || 'Desconhecido'}</TableCell>
                    <TableCell><Badge variant="outline">{b.area}</Badge></TableCell>
                    <TableCell className="text-right">{b.monthly_goal}</TableCell>
                    <TableCell className="text-right">{Number(b.total_weighted).toFixed(1)}</TableCell>
                    <TableCell className="text-right">{Number(b.excess_count).toFixed(1)}</TableCell>
                    <TableCell className="text-right font-medium">{fmt(Number(b.bonus_amount))}</TableCell>
                    <TableCell><Badge variant={cfg.variant} className="gap-1"><Icon className="h-3 w-3" />{cfg.label}</Badge></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default PremiacaoList;
