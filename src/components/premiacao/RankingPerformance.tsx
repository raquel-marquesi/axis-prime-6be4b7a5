import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, Medal, Award } from 'lucide-react';
import { useProfiles } from '@/hooks/useProfiles';

const RankingPerformance = () => {
  const now = new Date();
  const refStart = format(startOfMonth(now), 'yyyy-MM-dd');
  const refEnd = format(endOfMonth(now), 'yyyy-MM-dd');

  const { data: bonuses = [], isLoading } = useQuery({
    queryKey: ['ranking-performance', refStart],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bonus_calculations')
        .select('user_id, total_weighted, bonus_amount, area')
        .gte('reference_month', refStart)
        .lte('reference_month', refEnd)
        .order('total_weighted', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { profiles } = useProfiles();
  const profilesMap = useMemo(() => {
    const m: Record<string, string> = {};
    profiles.forEach(p => { m[p.user_id] = p.full_name; });
    return m;
  }, [profiles]);

  const rankIcons = [
    <Trophy className="h-5 w-5 text-yellow-500" />,
    <Medal className="h-5 w-5 text-slate-400" />,
    <Award className="h-5 w-5 text-amber-700" />,
  ];

  if (isLoading) return <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>;

  return (
    <Card>
      <CardHeader><CardTitle>Ranking de Performance — {format(now, 'MMMM yyyy')}</CardTitle></CardHeader>
      <CardContent>
        {bonuses.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Nenhum dado de performance disponível para este mês.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">#</TableHead>
                <TableHead>Profissional</TableHead>
                <TableHead>Área</TableHead>
                <TableHead className="text-right">Produção Ponderada</TableHead>
                <TableHead className="text-right">Bônus</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bonuses.map((b: any, i: number) => (
                <TableRow key={`${b.user_id}-${i}`}>
                  <TableCell>{i < 3 ? rankIcons[i] : <span className="text-muted-foreground font-medium">{i + 1}º</span>}</TableCell>
                  <TableCell className="font-medium">{profilesMap[b.user_id] || 'Desconhecido'}</TableCell>
                  <TableCell><Badge variant="outline">{b.area}</Badge></TableCell>
                  <TableCell className="text-right">{Number(b.total_weighted).toFixed(1)}</TableCell>
                  <TableCell className="text-right font-medium">{Number(b.bonus_amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default RankingPerformance;
