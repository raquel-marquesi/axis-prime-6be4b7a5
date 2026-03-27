import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { AREA_LABELS } from '@/types/auth';

const MetasEquipe = () => {
  const { data: goals = [], isLoading } = useQuery({
    queryKey: ['area-goals'],
    queryFn: async () => {
      const { data, error } = await supabase.from('area_goals').select('*').order('area');
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>;

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <Card>
      <CardHeader><CardTitle>Metas por Área / Equipe</CardTitle></CardHeader>
      <CardContent>
        {goals.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Nenhuma meta configurada. Configure metas na área de administração.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Área</TableHead>
                <TableHead className="text-right">Meta Mensal</TableHead>
                <TableHead className="text-right">Valor Extra p/ Cálculo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {goals.map((g: any) => (
                <TableRow key={g.id}>
                  <TableCell><Badge variant="outline">{(AREA_LABELS as any)[g.area] || g.area}</Badge></TableCell>
                  <TableCell className="text-right font-medium">{g.monthly_goal} cálculos</TableCell>
                  <TableCell className="text-right">{fmt(Number(g.extra_value_per_calculation || 0))}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default MetasEquipe;
