import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ReportExportButton } from './ReportExportButton';

const CarteiraReport = () => {
  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['carteira-report'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, razao_social, nome, tipo, is_active, tipo_cadastro, contrato_data_inicio, contrato_data_vencimento, centro_custo')
        .eq('tipo_cadastro', 'cliente')
        .order('razao_social');
      if (error) throw error;
      return data;
    },
  });

  const { data: processCounts = {} } = useQuery({
    queryKey: ['carteira-process-counts'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_process_counts_by_client');
      if (error) throw error;
      const counts: Record<string, number> = {};
      (data || []).forEach((row: any) => { counts[row.client_id] = Number(row.process_count); });
      return counts;
    },
  });

  const enrichedClients = clients.map((c: any) => ({
    ...c,
    processo_count: processCounts[c.id] || 0,
    display_name: c.razao_social || c.nome || '—',
    centro_custo_display: c.centro_custo || '',
  }));

  const exportColumns = [
    { key: 'display_name', label: 'Cliente' },
    { key: 'tipo', label: 'Tipo' },
    { key: 'processo_count', label: 'Processos' },
    { key: 'is_active', label: 'Status', format: (v: boolean) => v ? 'Ativo' : 'Inativo' },
    { key: 'centro_custo_display', label: 'Centro de Custo' },
    { key: 'contrato_data_inicio', label: 'Início Contrato' },
    { key: 'contrato_data_vencimento', label: 'Vencimento Contrato' },
  ];

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Relatório de Carteira</CardTitle>
          <CardDescription>Visão geral dos clientes e volume de processos.</CardDescription>
        </div>
        <ReportExportButton data={enrichedClients} columns={exportColumns} filename="relatorio-carteira" />
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center p-3 rounded-lg bg-muted/50"><p className="text-sm text-muted-foreground">Total Clientes</p><p className="text-2xl font-bold">{clients.length}</p></div>
          <div className="text-center p-3 rounded-lg bg-muted/50"><p className="text-sm text-muted-foreground">Ativos</p><p className="text-2xl font-bold text-green-600">{clients.filter((c: any) => c.is_active).length}</p></div>
          <div className="text-center p-3 rounded-lg bg-muted/50"><p className="text-sm text-muted-foreground">Inativos</p><p className="text-2xl font-bold text-muted-foreground">{clients.filter((c: any) => !c.is_active).length}</p></div>
        </div>
        {enrichedClients.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Nenhum cliente encontrado.</p>
        ) : (
          <Table>
            <TableHeader><TableRow><TableHead>Cliente</TableHead><TableHead>Tipo</TableHead><TableHead className="text-right">Processos</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {enrichedClients.map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.display_name}</TableCell>
                  <TableCell><Badge variant="outline">{c.tipo === 'pf' ? 'PF' : 'PJ'}</Badge></TableCell>
                  <TableCell className="text-right">{c.processo_count}</TableCell>
                  <TableCell><Badge variant={c.is_active ? 'default' : 'secondary'}>{c.is_active ? 'Ativo' : 'Inativo'}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default CarteiraReport;
