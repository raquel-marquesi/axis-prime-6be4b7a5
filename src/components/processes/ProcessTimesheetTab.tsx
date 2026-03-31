import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';

interface ProcessTimesheetTabProps {
  processId: string;
}

export function ProcessTimesheetTab({ processId }: ProcessTimesheetTabProps) {
  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['process-timesheet', processId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('timesheet_entries')
        .select('id, data_atividade, descricao, quantidade, user_id, activity_type_id, client_id, status_faturamento, observacao, source')
        .eq('process_id', processId)
        .order('data_atividade', { ascending: false });
      if (error) throw error;

      const userIds = [...new Set((data || []).map(e => e.user_id).filter(Boolean))];
      const activityIds = [...new Set((data || []).map(e => e.activity_type_id).filter(Boolean))];

      const [profilesRes, activitiesRes] = await Promise.all([
        userIds.length > 0
          ? supabase.from('profiles').select('user_id, nome').in('user_id', userIds)
          : { data: [] },
        activityIds.length > 0
          ? supabase.from('activity_types').select('id, name, weight').in('id', activityIds)
          : { data: [] },
      ]);

      const profileMap = new Map((profilesRes.data || []).map(p => [p.user_id, p.nome]));
      const activityMap = new Map((activitiesRes.data || []).map(a => [a.id, a]));

      return (data || []).map(e => ({
        ...e,
        responsavel: profileMap.get(e.user_id) || 'Desconhecido',
        atividade: activityMap.get(e.activity_type_id)?.name || '-',
        peso: activityMap.get(e.activity_type_id)?.weight || 0,
      }));
    },
    enabled: !!processId,
  });

  if (isLoading) {
    return <div className="space-y-2 pt-2">{[1,2,3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>;
  }

  if (entries.length === 0) {
    return <div className="text-center py-8 text-muted-foreground text-sm">Nenhuma atividade registrada para este processo.</div>;
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">{entries.length} atividade{entries.length !== 1 ? 's' : ''} registrada{entries.length !== 1 ? 's' : ''}</p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Responsável</TableHead>
            <TableHead>Atividade</TableHead>
            <TableHead>Descrição</TableHead>
            <TableHead className="text-right">Qtd/Peso</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map(e => (
            <TableRow key={e.id}>
              <TableCell className="whitespace-nowrap">{e.data_atividade ? format(new Date(e.data_atividade + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR }) : '-'}</TableCell>
              <TableCell>{e.responsavel}</TableCell>
              <TableCell>{e.atividade}</TableCell>
              <TableCell className="max-w-[200px] truncate">{e.descricao || '-'}</TableCell>
              <TableCell className="text-right tabular-nums">{e.quantidade ?? 1} × {e.peso}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
